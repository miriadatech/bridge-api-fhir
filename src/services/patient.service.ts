import pool from '../config/database';
import { PatientTranslator } from '../translators/patient.translator';
import { MinistryClient } from '../ministry/ministry.client';
import { v4 as uuidv4 } from 'uuid';

const ministryClient = new MinistryClient();

export class PatientService {

    // ─── CREAR PACIENTE ───────────────────────────────────────────────
    async createPatient(data: any) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Verificar duplicado por documento
            const duplicate = await client.query(
                `SELECT id FROM patients 
         WHERE identifier_type = $1 
         AND identifier_value = $2 
         AND deleted_at IS NULL`,
                [data.identifier_type, data.identifier_value]
            );

            if (duplicate.rows.length > 0) {
                throw {
                    status: 409,
                    message: `Ya existe un paciente con ${data.identifier_type}: ${data.identifier_value}`
                };
            }

            // 2. Sincronizar con Ministerio
            let ministry_fhir_id: string | null = null;
            let ministry_synced = false;
            const mode = process.env.MINISTRY_MODE || 'sandbox';

            try {
                const fhirResource = PatientTranslator.toFHIR(data);
                const ministryResponse = await ministryClient.createPatient(fhirResource);
                ministry_fhir_id = ministryResponse?.id || null;
                ministry_synced = true;
            } catch (ministryError: any) {
                if (mode === 'strict') {
                    throw {
                        status: 502,
                        message: 'Error sincronizando con el Ministerio de Salud',
                        detail: ministryError.message
                    };
                }
                // En sandbox: continúa sin sincronización
                console.warn('Ministry sync failed (sandbox mode):', ministryError.message);
            }

            // 3. Insertar en BD
            const id = uuidv4();
            const result = await client.query(
                `INSERT INTO patients (
          id, family_name, given_name, middle_name,
          identifier_type, identifier_value,
          birth_date, gender, phone, email, address,
          city, department, country,
          marital_status, blood_type, rh_type,
          ethnicity, disability_status,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          ministry_fhir_id, ministry_synced,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
          NOW(), NOW()
        ) RETURNING *`,
                [
                    id,
                    data.family_name,
                    data.given_name,
                    data.middle_name || null,
                    data.identifier_type,
                    data.identifier_value,
                    data.birth_date || null,
                    data.gender || null,
                    data.phone || null,
                    data.email || null,
                    data.address || null,
                    data.city || null,
                    data.department || null,
                    data.country || 'Colombia',
                    data.marital_status || null,
                    data.blood_type || null,
                    data.rh_type || null,
                    data.ethnicity || null,
                    data.disability_status || false,
                    data.emergency_contact_name || null,
                    data.emergency_contact_phone || null,
                    data.emergency_contact_relationship || null,
                    ministry_fhir_id,
                    ministry_synced
                ]
            );

            await client.query('COMMIT');
            return PatientTranslator.toSimpleResponse(result.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── OBTENER POR ID ───────────────────────────────────────────────
    async getPatientById(id: string) {
        const result = await pool.query(
            `SELECT * FROM patients 
       WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            throw { status: 404, message: `Paciente con id ${id} no encontrado` };
        }

        return PatientTranslator.toSimpleResponse(result.rows[0]);
    }

    // ─── OBTENER POR DOCUMENTO ────────────────────────────────────────
    async getPatientByIdentifier(type: string, value: string) {
        const result = await pool.query(
            `SELECT * FROM patients 
       WHERE identifier_type = $1 
       AND identifier_value = $2 
       AND deleted_at IS NULL`,
            [type, value]
        );

        if (result.rows.length === 0) {
            throw {
                status: 404,
                message: `Paciente con ${type}: ${value} no encontrado`
            };
        }

        return PatientTranslator.toSimpleResponse(result.rows[0]);
    }

    // ─── LISTAR CON PAGINACIÓN ────────────────────────────────────────
    async listPatients(filters: {
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE deleted_at IS NULL';
        const params: any[] = [];
        let paramCount = 1;

        if (filters.search) {
            whereClause += ` AND (
        family_name      ILIKE $${paramCount}   OR
        given_name       ILIKE $${paramCount}   OR
        identifier_value ILIKE $${paramCount}   OR
        email            ILIKE $${paramCount}
      )`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        // Total de registros
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM patients ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Registros paginados
        const dataResult = await pool.query(
            `SELECT * FROM patients ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
            [...params, limit, offset]
        );

        return {
            data: dataResult.rows.map(PatientTranslator.toSimpleResponse),
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // ─── ACTUALIZAR ───────────────────────────────────────────────────
    async updatePatient(id: string, data: any) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verificar que existe
            const existing = await client.query(
                `SELECT * FROM patients WHERE id = $1 AND deleted_at IS NULL`,
                [id]
            );

            if (existing.rows.length === 0) {
                throw { status: 404, message: `Paciente con id ${id} no encontrado` };
            }

            const current = existing.rows[0];

            // Re-sincronizar con Ministerio si ya estaba sincronizado
            let ministry_fhir_id = current.ministry_fhir_id;
            let ministry_synced = current.ministry_synced;

            if (current.ministry_fhir_id) {
                try {
                    const merged = { ...current, ...data };
                    const fhirResource = PatientTranslator.toFHIR(merged);
                    await ministryClient.updatePatient(current.ministry_fhir_id, fhirResource);
                    ministry_synced = true;
                } catch (ministryError: any) {
                    ministry_synced = false;
                    console.warn('Ministry update failed:', ministryError.message);
                }
            }

            const result = await client.query(
                `UPDATE patients SET
          family_name                    = COALESCE($1,  family_name),
          given_name                     = COALESCE($2,  given_name),
          middle_name                    = COALESCE($3,  middle_name),
          birth_date                     = COALESCE($4,  birth_date),
          gender                         = COALESCE($5,  gender),
          phone                          = COALESCE($6,  phone),
          email                          = COALESCE($7,  email),
          address                        = COALESCE($8,  address),
          city                           = COALESCE($9,  city),
          department                     = COALESCE($10, department),
          marital_status                 = COALESCE($11, marital_status),
          blood_type                     = COALESCE($12, blood_type),
          rh_type                        = COALESCE($13, rh_type),
          ethnicity                      = COALESCE($14, ethnicity),
          disability_status              = COALESCE($15, disability_status),
          emergency_contact_name         = COALESCE($16, emergency_contact_name),
          emergency_contact_phone        = COALESCE($17, emergency_contact_phone),
          emergency_contact_relationship = COALESCE($18, emergency_contact_relationship),
          ministry_fhir_id               = $19,
          ministry_synced                = $20,
          updated_at                     = NOW()
        WHERE id = $21 
        RETURNING *`,
                [
                    data.family_name || null,
                    data.given_name || null,
                    data.middle_name || null,
                    data.birth_date || null,
                    data.gender || null,
                    data.phone || null,
                    data.email || null,
                    data.address || null,
                    data.city || null,
                    data.department || null,
                    data.marital_status || null,
                    data.blood_type || null,
                    data.rh_type || null,
                    data.ethnicity || null,
                    data.disability_status ?? null,
                    data.emergency_contact_name || null,
                    data.emergency_contact_phone || null,
                    data.emergency_contact_relationship || null,
                    ministry_fhir_id,
                    ministry_synced,
                    id
                ]
            );

            await client.query('COMMIT');
            return PatientTranslator.toSimpleResponse(result.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── ELIMINAR (SOFT DELETE) ───────────────────────────────────────
    async deletePatient(id: string) {
        const result = await pool.query(
            `UPDATE patients 
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            throw { status: 404, message: `Paciente con id ${id} no encontrado` };
        }

        return { message: `Paciente ${id} eliminado correctamente` };
    }

    // ─── SINCRONIZACIÓN MANUAL ────────────────────────────────────────
    async syncWithMinistry(id: string) {
        const result = await pool.query(
            `SELECT * FROM patients WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            throw { status: 404, message: `Paciente con id ${id} no encontrado` };
        }

        const patient = result.rows[0];

        try {
            const fhirResource = PatientTranslator.toFHIR(patient);
            let ministryResponse: any;

            if (patient.ministry_fhir_id) {
                ministryResponse = await ministryClient.updatePatient(
                    patient.ministry_fhir_id,
                    fhirResource
                );
            } else {
                ministryResponse = await ministryClient.createPatient(fhirResource);
            }

            const ministry_fhir_id = ministryResponse?.id || patient.ministry_fhir_id;

            await pool.query(
                `UPDATE patients 
         SET ministry_fhir_id = $1, ministry_synced = true, updated_at = NOW()
         WHERE id = $2`,
                [ministry_fhir_id, id]
            );

            return {
                message: 'Sincronización exitosa',
                ministry_fhir_id
            };

        } catch (error: any) {
            await pool.query(
                `UPDATE patients 
         SET ministry_synced = false, updated_at = NOW()
         WHERE id = $1`,
                [id]
            );
            throw {
                status: 502,
                message: 'Error sincronizando con el Ministerio',
                detail: error.message
            };
        }
    }
}
