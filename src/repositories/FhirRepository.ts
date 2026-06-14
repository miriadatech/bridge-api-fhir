// src/repositories/FhirRepository.ts
// Acceso a datos de la tabla interoperabilidad_recibida para el worker
import { Pool, PoolClient } from 'pg';
import { EstadoRegistro, RegistroFhir } from '../types/worker.types';

export class FhirRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Obtiene y bloquea atómicamente los registros en estado RECIBIDO o REINTENTANDO
   * usando FOR UPDATE SKIP LOCKED para concurrencia segura multi-instancia.
   *
   * Retorna un cliente de pool con la transacción abierta.
   * El llamador DEBE llamar a commitTransaction() o rollbackTransaction() al terminar.
   */
  async getYBloquearPendientes(
    limite: number,
    maxIntentos: number,
  ): Promise<{ registros: RegistroFhir[]; client: PoolClient }> {
    const client = await this.pool.connect();

    await client.query('BEGIN');

    const sql = `
      SELECT
        id,
        uuid_evento,
        ips_id,
        historia_id,
        tipo_evento,
        payload_original,
        payload_fhir,
        estado,
        ministerio_id,
        respuesta_ministerio,
        intentos,
        ultimo_error,
        fecha_ultimo_intento,
        created_at,
        updated_at
      FROM interoperabilidad_recibida
      WHERE estado IN ($1, $2)
        AND intentos < $3
      ORDER BY created_at ASC
      LIMIT $4
      FOR UPDATE SKIP LOCKED
    `;

    const result = await client.query<RegistroFhir>(sql, [
      EstadoRegistro.RECIBIDO,
      EstadoRegistro.REINTENTANDO,
      maxIntentos,
      limite,
    ]);

    return { registros: result.rows, client };
  }

  /**
   * Marca un registro como ENVIANDO dentro de una transacción ya abierta.
   * Debe llamarse ANTES de soltar el lock (COMMIT).
   */
  async marcarEnviando(id: number, client: PoolClient): Promise<void> {
    const sql = `
      UPDATE interoperabilidad_recibida
      SET
        estado      = $1,
        updated_at  = NOW()
      WHERE id = $2
    `;
    await client.query(sql, [EstadoRegistro.ENVIANDO, id]);
  }

  /**
   * Confirma la transacción (libera los locks).
   */
  async commitTransaction(client: PoolClient): Promise<void> {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Revierte la transacción en caso de error inesperado.
   */
  async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza el registro como ENVIADO tras un envío exitoso.
   */
  async marcarEnviado(
    id: number,
    ministerioId: string | null,
    respuesta: Record<string, unknown>,
  ): Promise<void> {
    const sql = `
      UPDATE interoperabilidad_recibida
      SET
        estado                = $1,
        ministerio_id         = $2,
        respuesta_ministerio  = $3,
        fecha_ultimo_intento  = NOW(),
        ultimo_error          = NULL,
        updated_at            = NOW()
      WHERE id = $4
    `;
    await this.pool.query(sql, [
      EstadoRegistro.ENVIADO,
      ministerioId,
      JSON.stringify(respuesta),
      id,
    ]);
  }

  /**
   * Actualiza el registro cuando ocurre un error.
   * Si intentos >= maxIntentos → estado ERROR (permanente).
   * Si intentos < maxIntentos  → estado REINTENTANDO.
   */
  async marcarError(
    id: number,
    mensaje: string,
    intentosActuales: number,
    maxIntentos: number,
  ): Promise<void> {
    const nuevosIntentos = intentosActuales + 1;
    const nuevoEstado =
      nuevosIntentos >= maxIntentos
        ? EstadoRegistro.ERROR
        : EstadoRegistro.REINTENTANDO;

    const sql = `
      UPDATE interoperabilidad_recibida
      SET
        estado               = $1,
        intentos             = $2,
        ultimo_error         = $3,
        fecha_ultimo_intento = NOW(),
        updated_at           = NOW()
      WHERE id = $4
    `;
    await this.pool.query(sql, [nuevoEstado, nuevosIntentos, mensaje, id]);
  }

  /**
   * Resetea registros que quedaron en estado ENVIANDO tras un crash del worker.
   * Se llama al inicio para recuperar registros huérfanos de > 5 minutos.
   */
  async resetearEnviandoHuerfanos(): Promise<number> {
    const sql = `
      UPDATE interoperabilidad_recibida
      SET
        estado     = $1,
        updated_at = NOW()
      WHERE estado = $2
        AND updated_at < NOW() - INTERVAL '5 minutes'
    `;
    const result = await this.pool.query(sql, [
      EstadoRegistro.REINTENTANDO,
      EstadoRegistro.ENVIANDO,
    ]);
    return result.rowCount ?? 0;
  }
}
