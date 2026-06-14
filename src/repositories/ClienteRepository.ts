// src/repositories/ClienteRepository.ts
// Acceso a datos de la tabla clientes para el worker
import { Pool, PoolClient } from 'pg';
import { ClienteCredenciales } from '../types/worker.types';

export class ClienteRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Obtiene las credenciales de un cliente por su UUID.
   * Retorna null si no existe o está inactivo.
   */
  async getById(id: string): Promise<ClienteCredenciales | null> {
    const sql = `
      SELECT
        id,
        nit,
        nombre,
        ministry_client_id,
        ministry_client_secret,
        ministry_auth_url,
        ministry_scope,
        ministry_mode,
        ministry_api_url,
        ministry_api_murl,
        ministry_api_msubs_key,
        ministry_tenant_id,
        is_active
      FROM clientes
      WHERE id = $1
        AND is_active = true
        AND estado = 'Activo'
    `;

    const result = await this.pool.query<ClienteCredenciales>(sql, [id]);

    if (result.rowCount === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Obtiene múltiples clientes por lista de UUIDs (batch eficiente).
   */
  async getByIds(ids: string[]): Promise<Map<string, ClienteCredenciales>> {
    if (ids.length === 0) return new Map();

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `
      SELECT
        id,
        nit,
        nombre,
        ministry_client_id,
        ministry_client_secret,
        ministry_auth_url,
        ministry_scope,
        ministry_mode,
        ministry_api_url,
        ministry_api_murl,
        ministry_api_msubs_key,
        ministry_tenant_id,
        is_active
      FROM clientes
      WHERE id IN (${placeholders})
        AND is_active = true
        AND estado = 'Activo'
    `;

    const result = await this.pool.query<ClienteCredenciales>(sql, ids);

    const map = new Map<string, ClienteCredenciales>();
    for (const row of result.rows) {
      map.set(row.id, row);
    }
    return map;
  }

  /**
   * Versión que acepta una conexión existente (para uso dentro de transacciones).
   */
  async getByIdInTransaction(
    id: string,
    client: PoolClient,
  ): Promise<ClienteCredenciales | null> {
    const sql = `
      SELECT
        id, nit, nombre, ministry_client_id, ministry_client_secret,
        ministry_auth_url, ministry_scope, ministry_mode, ministry_api_url,
        ministry_api_murl, ministry_api_msubs_key, ministry_tenant_id, is_active
      FROM clientes
      WHERE id = $1 AND is_active = true AND estado = 'Activo'
    `;

    const result = await client.query<ClienteCredenciales>(sql, [id]);
    return result.rowCount! > 0 ? result.rows[0] : null;
  }
}
