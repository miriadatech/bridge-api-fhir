// src/services/consultation.service.ts
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
    CreateConsultationDTO,
    UpdateConsultationDTO,
    CreatePrescriptionDTO,
    CreateLabOrderDTO,
    UpdateLabOrderDTO,
} from '../types/consultation.types';
import { RDAService } from './RDAService';
import { ministryClient } from '../utils/ministryClient';

// Instancia única del servicio RDA (no tiene estado)
const rdaService = new RDAService();

class ConsultationService {

    // =========================================================================
    // CREATE
    // =========================================================================
    async create(dto: CreateConsultationDTO, tenantId: string) {
        const client = await pool.connect();
        let newId: string;

        try {
            await client.query('BEGIN');

            const id = uuidv4();
            newId = id;
            const encounterId = uuidv4();
            const now = new Date();

            await client.query(
                `INSERT INTO medical_consultations (
                    id, tenant_id, patient_id, encounter_id,
                    consultation_type, specialty,
                    doctor_name, doctor_license,
                    consultation_date,
                    reason, symptoms,
                    diagnosis_code, diagnosis_desc,
                    treatment_plan, notes,
                    next_appointment,
                    weight_kg, height_cm, temperature_c,
                    blood_pressure, heart_rate, oxygen_saturation,
                    status, sync_status,
                    active,
                    created_at, updated_at
                ) VALUES (
                    $1,  $2,  $3,  $4,
                    $5,  $6,
                    $7,  $8,
                    $9,
                    $10, $11,
                    $12, $13,
                    $14, $15,
                    $16,
                    $17, $18, $19,
                    $20, $21, $22,
                    'completed', 'pending',
                    true,
                    $23, $24
                )`,
                [
                    id, tenantId, dto.patient_id, encounterId,
                    dto.consultation_type, dto.specialty,
                    dto.doctor_name, dto.doctor_id ?? null,
                    now,
                    dto.reason, dto.symptoms ?? null,
                    dto.diagnosis_code ?? null, dto.diagnosis_desc ?? null,
                    dto.treatment_plan ?? null, dto.notes ?? null,
                    dto.follow_up_date ? new Date(dto.follow_up_date) : null,
                    dto.vital_signs?.weight_kg ?? null,
                    dto.vital_signs?.height_cm ?? null,
                    dto.vital_signs?.temperature_c ?? null,
                    dto.vital_signs?.blood_pressure ?? null,
                    dto.vital_signs?.heart_rate ?? null,
                    dto.vital_signs?.oxygen_saturation ?? null,
                    now, now,
                ],
            );

            if (dto.prescriptions?.length) {
                for (const rx of dto.prescriptions) {
                    await this._insertPrescription(
                        client, id, dto.patient_id, tenantId, rx, now,
                    );
                }
            }

            if (dto.lab_orders?.length) {
                for (const lab of dto.lab_orders) {
                    await this._insertLabOrder(
                        client, id, dto.patient_id, tenantId, lab, now,
                    );
                }
            }

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        return this._findByIdWithPool(newId!, tenantId);
    }

    // =========================================================================
    // FIND BY ID (público)
    // =========================================================================
    async findById(id: string, tenantId: string) {
        return this._findByIdWithPool(id, tenantId);
    }

    // =========================================================================
    // FIND BY ID (privado, usa pool)
    // =========================================================================
    private async _findByIdWithPool(id: string, tenantId: string) {
        console.log(id, tenantId);
        const result = await pool.query(
            `SELECT
                mc.*,
                COALESCE(
                    json_agg(DISTINCT to_jsonb(p.*))
                    FILTER (WHERE p.id IS NOT NULL), '[]'
                ) AS prescriptions,
                COALESCE(
                    json_agg(DISTINCT to_jsonb(lo.*))
                    FILTER (WHERE lo.id IS NOT NULL), '[]'
                ) AS lab_orders
             FROM medical_consultations mc
             LEFT JOIN prescriptions p
                ON p.consultation_id = mc.id
               AND p.active = true
             LEFT JOIN lab_orders lo
                ON lo.consultation_id = mc.id
               AND lo.active = true
             WHERE mc.id        = $1
               AND mc.tenant_id = $2
               AND mc.active    = true
             GROUP BY mc.id`,
            [id, tenantId],
        );

        if (!result.rows[0]) {
            throw new Error(`Consulta no encontrada`);
        }

        return result.rows[0];
    }

    // =========================================================================
    // FIND BY PATIENT
    // =========================================================================
    async findByPatient(
        patientId: string,
        tenantId: string,
        limit = 50,
        offset = 0,
    ) {
        const [countResult, result] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) FROM medical_consultations
                 WHERE patient_id = $1
                   AND tenant_id  = $2
                   AND active     = true`,
                [patientId, tenantId],
            ),
            pool.query(
                `SELECT
                    mc.*,
                    COALESCE(
                        json_agg(DISTINCT to_jsonb(p.*))
                        FILTER (WHERE p.id IS NOT NULL), '[]'
                    ) AS prescriptions,
                    COALESCE(
                        json_agg(DISTINCT to_jsonb(lo.*))
                        FILTER (WHERE lo.id IS NOT NULL), '[]'
                    ) AS lab_orders
                 FROM medical_consultations mc
                 LEFT JOIN prescriptions p
                    ON p.consultation_id = mc.id
                   AND p.active = true
                 LEFT JOIN lab_orders lo
                    ON lo.consultation_id = mc.id
                   AND lo.active = true
                 WHERE mc.patient_id = $1
                   AND mc.tenant_id  = $2
                   AND mc.active     = true
                 GROUP BY mc.id
                 ORDER BY mc.consultation_date DESC
                 LIMIT $3 OFFSET $4`,
                [patientId, tenantId, limit, offset],
            ),
        ]);

        return {
            data: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
        };
    }

    // =========================================================================
    // FIND ALL
    // =========================================================================
    async findAll(tenantId: string) {
        const result = await pool.query(
            `SELECT
                mc.*,
                COALESCE(
                    json_agg(DISTINCT to_jsonb(p.*))
                    FILTER (WHERE p.id IS NOT NULL), '[]'
                ) AS prescriptions,
                COALESCE(
                    json_agg(DISTINCT to_jsonb(lo.*))
                    FILTER (WHERE lo.id IS NOT NULL), '[]'
                ) AS lab_orders
             FROM medical_consultations mc
             LEFT JOIN prescriptions p
                ON p.consultation_id = mc.id
               AND p.active = true
             LEFT JOIN lab_orders lo
                ON lo.consultation_id = mc.id
               AND lo.active = true
             WHERE mc.tenant_id = $1
               AND mc.active    = true
             GROUP BY mc.id
             ORDER BY mc.consultation_date DESC`,
            [tenantId],
        );
        return result.rows;
    }

    // =========================================================================
    // UPDATE
    // =========================================================================
    async update(id: string, dto: UpdateConsultationDTO, tenantId: string) {
        // Verificar que existe
        await this.findById(id, tenantId);

        const fields: string[] = [];
        const values: any[] = [];

        // Helper: solo agrega si el valor no es undefined
        const add = (col: string, val: any) => {
            if (val !== undefined) {
                fields.push(`${col} = $${fields.length + 1}`);
                values.push(val);
            }
        };

        add('reason', dto.reason);
        add('symptoms', dto.symptoms);
        add('diagnosis_code', dto.diagnosis_code);
        add('diagnosis_desc', dto.diagnosis_desc);
        add('treatment_plan', dto.treatment_plan);
        add('notes', dto.notes);
        add('status', dto.status);
        add('next_appointment',
            dto.follow_up_date ? new Date(dto.follow_up_date) : undefined,
        );

        if (dto.vital_signs) {
            add('weight_kg', dto.vital_signs.weight_kg);
            add('height_cm', dto.vital_signs.height_cm);
            add('temperature_c', dto.vital_signs.temperature_c);
            add('blood_pressure', dto.vital_signs.blood_pressure);
            add('heart_rate', dto.vital_signs.heart_rate);
            add('oxygen_saturation', dto.vital_signs.oxygen_saturation);
        }

        if (!fields.length) {
            throw new Error('No hay campos para actualizar');
        }

        // updated_at siempre al final de los SET
        fields.push(`updated_at = $${fields.length + 1}`);
        values.push(new Date());

        // WHERE params al final
        const idIdx = fields.length + 1;   // $N+1
        const tenantIdx = fields.length + 2;   // $N+2
        values.push(id, tenantId);

        await pool.query(
            `UPDATE medical_consultations
             SET ${fields.join(', ')}
             WHERE id        = $${idIdx}
               AND tenant_id = $${tenantIdx}
               AND active    = true`,
            values,
        );

        return this.findById(id, tenantId);
    }

    // =========================================================================
    // DELETE (soft)
    // =========================================================================
    async delete(id: string, tenantId: string) {
        await this.findById(id, tenantId);

        await pool.query(
            `UPDATE medical_consultations
             SET active     = false,
                 updated_at = NOW()
             WHERE id        = $1
               AND tenant_id = $2`,
            [id, tenantId],
        );
    }

    // =========================================================================
    // ADD PRESCRIPTION
    // =========================================================================
    async addPrescription(
        consultationId: string,
        dto: CreatePrescriptionDTO,
        tenantId: string,
    ) {
        const consultation = await this.findById(consultationId, tenantId);
        const client = await pool.connect();

        try {
            const rxId = await this._insertPrescription(
                client,
                consultationId,
                consultation.patient_id,
                tenantId,
                dto,
                new Date(),
            );

            const result = await client.query(
                'SELECT * FROM prescriptions WHERE id = $1',
                [rxId],
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // ADD LAB ORDER
    // =========================================================================
    async addLabOrder(
        consultationId: string,
        dto: CreateLabOrderDTO,
        tenantId: string,
    ) {
        const consultation = await this.findById(consultationId, tenantId);
        const client = await pool.connect();

        try {
            const loId = await this._insertLabOrder(
                client,
                consultationId,
                consultation.patient_id,
                tenantId,
                dto,
                new Date(),
            );

            const result = await client.query(
                'SELECT * FROM lab_orders WHERE id = $1',
                [loId],
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // UPDATE LAB ORDER RESULT
    // =========================================================================
    async updateLabOrderResult(
        labOrderId: string,
        dto: UpdateLabOrderDTO,
        tenantId: string,
    ) {
        const check = await pool.query(
            `SELECT lo.*
             FROM lab_orders lo
             JOIN medical_consultations mc
               ON mc.id = lo.consultation_id
             WHERE lo.id        = $1
               AND mc.tenant_id = $2
               AND lo.active    = true`,
            [labOrderId, tenantId],
        );

        if (!check.rows[0]) {
            throw new Error('Orden de laboratorio no encontrada');
        }

        await pool.query(
            `UPDATE lab_orders
             SET result      = $1,
                 result_date = $2,
                 status      = $3,
                 updated_at  = NOW()
             WHERE id = $4`,
            [
                dto.result,
                dto.result_date ? new Date(dto.result_date) : new Date(),
                dto.status ?? 'completed',
                labOrderId,
            ],
        );

        const result = await pool.query(
            'SELECT * FROM lab_orders WHERE id = $1',
            [labOrderId],
        );
        return result.rows[0];
    }

    // =========================================================================
    // SYNC TO MINISTRY  ← reescrito completamente
    // =========================================================================
    async syncToMinistry(
        consultationId: string,
        tenantId: string,
        mode: 'sandbox' | 'strict' = 'sandbox',
    ) {
        // 1. Verificar que la consulta existe y pertenece al tenant
        const consultation = await this.findById(consultationId, tenantId);

        // 2. Generar el Bundle RDA oficial usando RDAService
        //    (lee prescriptions, conditions, allergies, etc.)
        let bundle: object;
        try {
            bundle = await rdaService.generatePatientStatement(
                tenantId,
                consultationId,
            );
        } catch (err: any) {
            // Registrar fallo en sync_logs y relanzar
            await this._logSync(consultationId, tenantId, 'failed', err.message);
            throw err;
        }

        // 3. Persistir bundle en la consulta (RDAService ya lo hace,
        //    pero lo confirmamos aquí para el estado correcto)
        const syncStatus = mode === 'sandbox' ? 'sandbox' : 'synced';

        await pool.query(
            `UPDATE medical_consultations
             SET fhir_bundle = $1,
                 sync_status = $2,
                 synced_at   = NOW(),
                 updated_at  = NOW()
             WHERE id        = $3
               AND tenant_id = $4`,
            [JSON.stringify(bundle), syncStatus, consultationId, tenantId],
        );

        // 4. Modo sandbox → solo retornar el bundle sin enviar
        if (mode === 'sandbox') {
            await this._logSync(consultationId, tenantId, 'sandbox');
            return {
                success: true,
                mode: 'sandbox',
                message: 'Bundle RDA generado correctamente (no enviado a MinSalud)',
                bundle,
            };
        }

        // 5. Modo strict → enviar a MinSalud
        let ministryResponse: any = null;
        let ministryError: any = null;

        try {
            // Obtener credenciales del tenant
            const tenantResult = await pool.query(
                `SELECT ministry_mode, ministry_client_id,
                        ministry_client_secret, ministry_auth_url,
                        ministry_scope, ministry_api_url
                 FROM tenants
                 WHERE id = $1`,
                [tenantId],
            );

            const tenantRow = tenantResult.rows[0];

            if (!tenantRow?.ministry_client_id) {
                throw new Error(
                    'Tenant sin credenciales de MinSalud configuradas',
                );
            }

            // Crear cliente HTTP autenticado con MinSalud
            const client = await ministryClient(tenantRow);

            // Enviar bundle al endpoint RDA del ministerio
            const response = await client.post('/rda/Bundle', bundle);
            ministryResponse = response.data;

            await pool.query(
                `UPDATE medical_consultations
                 SET ministry_synced = true,
                     updated_at      = NOW()
                 WHERE id        = $1
                   AND tenant_id = $2`,
                [consultationId, tenantId],
            );

            await this._logSync(
                consultationId,
                tenantId,
                'success',
                undefined,
                ministryResponse,
            );

            return {
                success: true,
                mode: 'strict',
                message: 'Bundle RDA enviado exitosamente a MinSalud',
                ministryResponse,
            };

        } catch (err: any) {
            ministryError = err.response?.data ?? err.message;

            // Revertir sync_status a 'error' si el envío falló
            await pool.query(
                `UPDATE medical_consultations
                 SET sync_status = 'error',
                     updated_at  = NOW()
                 WHERE id        = $1
                   AND tenant_id = $2`,
                [consultationId, tenantId],
            );

            await this._logSync(
                consultationId,
                tenantId,
                'failed',
                JSON.stringify(ministryError),
            );

            throw new Error(
                `Error al enviar a MinSalud: ${JSON.stringify(ministryError)}`,
            );
        }
    }

    // =========================================================================
    // PRIVATE: LOG SYNC
    // =========================================================================
    private async _logSync(
        consultationId: string,
        tenantId: string,
        status: 'success' | 'failed' | 'sandbox' | 'pending',
        errorMessage?: string,
        responseBody?: object,
    ): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO ministry_sync_logs (
                    id, tenant_id, resource_type, resource_id,
                    status, error_message, response_body,
                    created_at
                ) VALUES (
                    $1, $2, 'Bundle', $3,
                    $4, $5, $6,
                    NOW()
                )
                ON CONFLICT DO NOTHING`,
                [
                    uuidv4(),
                    tenantId,
                    consultationId,
                    status,
                    errorMessage ?? null,
                    responseBody ? JSON.stringify(responseBody) : null,
                ],
            );
        } catch (logErr) {
            // Los errores de log nunca deben interrumpir el flujo principal
            console.error('[ConsultationService._logSync]', logErr);
        }
    }

    // =========================================================================
    // PRIVATE: INSERT PRESCRIPTION
    // =========================================================================
    private async _insertPrescription(
        client: any,
        consultationId: string,
        patientId: string,
        tenantId: string,
        dto: CreatePrescriptionDTO,
        now: Date,
    ): Promise<string> {
        const id = uuidv4();

        await client.query(
            `INSERT INTO prescriptions (
                id, consultation_id, patient_id, tenant_id,
                medication_name, medication_code,
                dosage, frequency, duration,
                route, instructions,
                active, created_at, updated_at
            ) VALUES (
                $1,  $2,  $3,  $4,
                $5,  $6,
                $7,  $8,  $9,
                $10, $11,
                true, $12, $13
            )`,
            [
                id, consultationId, patientId, tenantId,
                dto.medication_name,
                dto.medication_code ?? null,
                dto.dosage,
                dto.frequency,
                dto.duration ?? null,
                dto.route ?? null,
                dto.instructions ?? null,
                now, now,
            ],
        );

        return id;
    }

    // =========================================================================
    // PRIVATE: INSERT LAB ORDER
    // =========================================================================
    private async _insertLabOrder(
        client: any,
        consultationId: string,
        patientId: string,
        tenantId: string,
        dto: CreateLabOrderDTO,
        now: Date,
    ): Promise<string> {
        const id = uuidv4();

        await client.query(
            `INSERT INTO lab_orders (
                id, consultation_id, patient_id, tenant_id,
                exam_name, exam_code, exam_type,
                priority, instructions,
                status, active,
                created_at, updated_at
            ) VALUES (
                $1,  $2,  $3,  $4,
                $5,  $6,  $7,
                $8,  $9,
                $10, true,
                $11, $12
            )`,
            [
                id, consultationId, patientId, tenantId,
                dto.exam_name,
                dto.exam_code ?? null,
                dto.exam_type ?? null,
                dto.priority ?? 'routine',
                dto.instructions ?? null,
                'pending',
                now, now,
            ],
        );

        return id;
    }
}

export const consultationService = new ConsultationService();
