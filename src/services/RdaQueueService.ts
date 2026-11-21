// src/services/RdaQueueService.ts
// Encola los RDA traducidos en interoperabilidad_recibida (los envía el worker)
// y permite consultar su estado. Siempre filtra por el cliente autenticado.
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthTenant } from '../middleware/auth.middleware';
import { RdaTipo, RDA_TYPES, validateAndTranslate } from '../rda/rda.registry';

export interface EnqueueResult {
    ok: boolean;
    status: number;
    body: Record<string, unknown>;
}

const LIST_COLUMNS = `id, uuid_evento, historia_id, tipo_evento, estado, ministerio_id,
                      intentos, ultimo_error, fecha_ultimo_intento, created_at, updated_at`;

export class RdaQueueService {

    /**
     * Ajusta el bloque tenant del body con los datos del cliente autenticado.
     * El código de habilitación registrado en BD prevalece: el Ministerio rechaza el RDA
     * si el custodian no corresponde a la IPS dueña del token.
     */
    applyTenant(input: any, tenant: AuthTenant): string[] {
        const warnings: string[] = [];
        input.tenant = input.tenant ?? {};
        if (tenant.codigo_habilitacion) {
            if (input.tenant.institution_code && input.tenant.institution_code !== tenant.codigo_habilitacion) {
                warnings.push(
                    `tenant.institution_code (${input.tenant.institution_code}) no coincide con el código de habilitación ` +
                    `registrado para su API Key; se usó ${tenant.codigo_habilitacion}.`,
                );
            }
            input.tenant.institution_code = tenant.codigo_habilitacion;
        }
        input.tenant.id = tenant.id;
        input.tenant.name = input.tenant.name ?? tenant.name;
        input.tenant.nit = input.tenant.nit ?? tenant.nit ?? undefined;
        return warnings;
    }

    async enqueue(tenant: AuthTenant, tipo: RdaTipo, input: any, opts: { includeBundle?: boolean } = {}): Promise<EnqueueResult> {
        const warnings = this.applyTenant(input, tenant);
        const result = validateAndTranslate(tipo, input);
        if (!result.ok) {
            return { ok: false, status: 422, body: { success: false, tipo, errores: result.errors } };
        }

        const uuidEvento: string = String(input.uuid_evento ?? input.tenant?.idevento ?? uuidv4());
        const historiaId = input.historia_id ?? null;

        // Idempotencia: el mismo evento del HIS no se encola dos veces
        const existing = await pool.query(
            `SELECT ${LIST_COLUMNS} FROM interoperabilidad_recibida WHERE ips_id = $1 AND uuid_evento = $2 LIMIT 1`,
            [tenant.id, uuidEvento],
        );
        if (existing.rows.length > 0) {
            return {
                ok: true,
                status: 200,
                body: {
                    success: true,
                    duplicado: true,
                    mensaje: 'El evento ya había sido recibido; no se encoló de nuevo.',
                    envio: existing.rows[0],
                },
            };
        }

        let inserted;
        try {
            inserted = await pool.query(
                `INSERT INTO interoperabilidad_recibida
                     (uuid_evento, ips_id, historia_id, tipo_evento, payload_original, payload_fhir, estado, intentos)
                 VALUES ($1, $2, $3, $4, $5, $6, 'RECIBIDO', 0)
                 RETURNING id, uuid_evento, estado, created_at`,
                [uuidEvento, tenant.id, historiaId, tipo, JSON.stringify(input), JSON.stringify(result.bundle)],
            );
        } catch (err: any) {
            if (err?.code === '23505') { // carrera con otra petición igual (índice único ips_id+uuid_evento)
                return { ok: true, status: 200, body: { success: true, duplicado: true, mensaje: 'El evento ya había sido recibido.', uuid_evento: uuidEvento } };
            }
            throw err;
        }

        return {
            ok: true,
            status: 202,
            body: {
                success: true,
                mensaje: 'RDA validado, traducido y encolado para envío al Ministerio.',
                tipo,
                operacion: RDA_TYPES[tipo].operation,
                envio: inserted.rows[0],
                ...(warnings.length > 0 && { advertencias: warnings }),
                ...(opts.includeBundle && { bundle: result.bundle }),
            },
        };
    }

    async list(ipsId: string, f: { estado?: string; tipo?: string; desde?: string; hasta?: string; historia_id?: string; page?: number; pageSize?: number }) {
        const where: string[] = ['ips_id = $1'];
        const params: unknown[] = [ipsId];
        const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
        if (f.estado) add('estado = ?', f.estado.toUpperCase());
        if (f.tipo) add('tipo_evento = ?', f.tipo);
        if (f.desde) add('created_at >= ?', f.desde);
        if (f.hasta) add('created_at <= ?', f.hasta);
        if (f.historia_id) add('historia_id::text = ?', String(f.historia_id));

        const pageSize = Math.min(Math.max(f.pageSize ?? 50, 1), 200);
        const page = Math.max(f.page ?? 1, 1);

        const total = await pool.query(`SELECT COUNT(*)::int AS n FROM interoperabilidad_recibida WHERE ${where.join(' AND ')}`, params);
        const rows = await pool.query(
            `SELECT ${LIST_COLUMNS} FROM interoperabilidad_recibida
              WHERE ${where.join(' AND ')}
              ORDER BY created_at DESC
              LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
            params,
        );
        return { total: total.rows[0].n, page, pageSize, data: rows.rows };
    }

    async summary(ipsId: string) {
        const r = await pool.query(
            `SELECT tipo_evento, estado, COUNT(*)::int AS cantidad
               FROM interoperabilidad_recibida WHERE ips_id = $1
              GROUP BY tipo_evento, estado ORDER BY tipo_evento, estado`,
            [ipsId],
        );
        return r.rows;
    }

    async get(ipsId: string, id: string, includePayloads = false) {
        const cols = includePayloads
            ? `${LIST_COLUMNS}, respuesta_ministerio, payload_original, payload_fhir`
            : `${LIST_COLUMNS}, respuesta_ministerio`;
        const r = await pool.query(
            `SELECT ${cols} FROM interoperabilidad_recibida WHERE ips_id = $1 AND (id::text = $2 OR uuid_evento = $2) LIMIT 1`,
            [ipsId, id],
        );
        return r.rows[0] ?? null;
    }

    /** Vuelve a poner en cola un envío fallido (ERROR o REINTENTANDO), reiniciando los intentos. */
    async retry(tenant: AuthTenant, id: string): Promise<EnqueueResult> {
        const current = await this.get(tenant.id, id, true);
        if (!current || !['ERROR', 'REINTENTANDO'].includes(current.estado)) {
            return { ok: false, status: 409, body: { success: false, error: 'Solo se pueden reintentar envíos en estado ERROR o REINTENTANDO (o el envío no existe)' } };
        }
        // Se vuelve a traducir desde el JSON original para aplicar la configuración ACTUAL del
        // cliente (p. ej. codigo_habilitacion corregido) y las correcciones del traductor.
        let bundle = current.payload_fhir;
        let warnings: string[] = [];
        const tipo = current.tipo_evento as RdaTipo;
        if (RDA_TYPES[tipo] && current.payload_original) {
            const input = typeof current.payload_original === 'string' ? JSON.parse(current.payload_original) : current.payload_original;
            warnings = this.applyTenant(input, tenant);
            const result = validateAndTranslate(tipo, input);
            if (!result.ok) return { ok: false, status: 422, body: { success: false, tipo, errores: result.errors } };
            bundle = result.bundle;
        }
        const r = await pool.query(
            `UPDATE interoperabilidad_recibida
                SET payload_fhir = $3, estado = 'REINTENTANDO', intentos = 0, ultimo_error = NULL, updated_at = NOW()
              WHERE ips_id = $1 AND id = $2
          RETURNING ${LIST_COLUMNS}`,
            [tenant.id, current.id, JSON.stringify(bundle)],
        );
        return {
            ok: true, status: 200,
            body: { success: true, mensaje: 'Envío re-traducido y re-encolado', data: r.rows[0], ...(warnings.length > 0 && { advertencias: warnings }) },
        };
    }

    /**
     * Reemplaza el contenido de un envío que falló (corrección de datos) y lo vuelve a encolar.
     * Solo permitido si no fue ENVIADO.
     */
    async replace(tenant: AuthTenant, id: string, input: any): Promise<EnqueueResult> {
        const current = await this.get(tenant.id, id);
        if (!current) return { ok: false, status: 404, body: { success: false, error: 'Envío no encontrado' } };
        if (['ENVIADO', 'ENVIANDO'].includes(current.estado)) {
            return { ok: false, status: 409, body: { success: false, error: `No se puede modificar un envío en estado ${current.estado}` } };
        }
        const tipo = current.tipo_evento as RdaTipo;
        if (!RDA_TYPES[tipo]) {
            return { ok: false, status: 409, body: { success: false, error: `tipo_evento desconocido: ${current.tipo_evento}` } };
        }
        const warnings = this.applyTenant(input, tenant);
        const result = validateAndTranslate(tipo, input);
        if (!result.ok) return { ok: false, status: 422, body: { success: false, tipo, errores: result.errors } };

        const r = await pool.query(
            `UPDATE interoperabilidad_recibida
                SET payload_original = $3, payload_fhir = $4, estado = 'REINTENTANDO', intentos = 0,
                    ultimo_error = NULL, updated_at = NOW()
              WHERE ips_id = $1 AND id = $2
          RETURNING ${LIST_COLUMNS}`,
            [tenant.id, current.id, JSON.stringify(input), JSON.stringify(result.bundle)],
        );
        return {
            ok: true, status: 200,
            body: { success: true, mensaje: 'Envío corregido y re-encolado', envio: r.rows[0], ...(warnings.length > 0 && { advertencias: warnings }) },
        };
    }
}

export const rdaQueueService = new RdaQueueService();
export default rdaQueueService;
