// src/services/consultation.service.ts

import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { ConsultationTranslator, ConsultationData } from '../translators/consultation.translator';
import { ministryClient } from '../clients/ministry.client';
import {
    LocalConsultation,
    LocalPrescription,
    LocalLabOrder,
    CreateConsultationDTO,
    UpdateConsultationDTO,
    CreatePrescriptionDTO,
    UpdatePrescriptionDTO,
    CreateLabOrderDTO,
    UpdateLabOrderDTO
} from '../types/consultation.types';

export class ConsultationService {
    private translator: ConsultationTranslator;

    constructor() {
        this.translator = new ConsultationTranslator();
    }

    // =========================================================================
    // CONSULTATIONS
    // =========================================================================

    async create(
        dto: CreateConsultationDTO,
        tenantId: string
    ): Promise<LocalConsultation> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const id = uuidv4();
            const encounterId = uuidv4();
            const now = new Date().toISOString();

            const result = await client.query(
                `INSERT INTO medical_consultations
                    (id, patient_id, encounter_id, consultation_date,
                     reason_for_visit, chief_complaint, assessment, plan,
                     status, created_at, updated_at, tenant_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                 RETURNING *`,
                [
                    id, dto.patient_id, encounterId, now,
                    dto.reason_for_visit,
                    dto.chief_complaint ?? null,
                    dto.assessment ?? null,
                    dto.plan ?? null,
                    dto.status ?? 'pending',
                    now, now, tenantId
                ]
            );

            await client.query('COMMIT');
            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findById(
        id: string,
        tenantId: string
    ): Promise<LocalConsultation> {
        const result = await pool.query(
            `SELECT * FROM medical_consultations
             WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Consulta ${id} no encontrada`);
        }

        return result.rows[0];
    }

    async findByPatient(
        patientId: string,
        tenantId: string,
        limit = 50,
        offset = 0
    ): Promise<{ data: LocalConsultation[]; total: number }> {
        const [countResult, dataResult] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS total FROM medical_consultations
                 WHERE patient_id = $1 AND tenant_id = $2`,
                [patientId, tenantId]
            ),
            pool.query(
                `SELECT * FROM medical_consultations
                 WHERE patient_id = $1 AND tenant_id = $2
                 ORDER BY consultation_date DESC
                 LIMIT $3 OFFSET $4`,
                [patientId, tenantId, limit, offset]
            )
        ]);

        return {
            data: dataResult.rows,
            total: parseInt(countResult.rows[0].total, 10)
        };
    }

    async update(
        id: string,
        dto: UpdateConsultationDTO,
        tenantId: string
    ): Promise<LocalConsultation> {
        const fields: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (dto.assessment !== undefined) { fields.push(`assessment = $${p++}`); values.push(dto.assessment); }
        if (dto.plan !== undefined) { fields.push(`plan = $${p++}`); values.push(dto.plan); }
        if (dto.status !== undefined) { fields.push(`status = $${p++}`); values.push(dto.status); }

        if (fields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        fields.push(`updated_at = $${p++}`);
        values.push(new Date().toISOString());

        const result = await pool.query(
            `UPDATE medical_consultations
             SET ${fields.join(', ')}
             WHERE id = $${p} AND tenant_id = $${p + 1}
             RETURNING *`,
            [...values, id, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Consulta ${id} no encontrada`);
        }

        return result.rows[0];
    }

    async delete(id: string, tenantId: string): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'DELETE FROM prescriptions WHERE consultation_id = $1 AND tenant_id = $2',
                [id, tenantId]
            );
            await client.query(
                'DELETE FROM lab_orders WHERE consultation_id = $1 AND tenant_id = $2',
                [id, tenantId]
            );

            const result = await client.query(
                'DELETE FROM medical_consultations WHERE id = $1 AND tenant_id = $2',
                [id, tenantId]
            );

            if (result.rowCount === 0) {
                throw new Error(`Consulta ${id} no encontrada`);
            }

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // PRESCRIPTIONS
    // =========================================================================

    async addPrescription(
        consultationId: string,
        dto: CreatePrescriptionDTO,
        tenantId: string
    ): Promise<LocalPrescription> {
        const id = uuidv4();
        const now = new Date().toISOString();

        // Verificar que la consulta existe y pertenece al tenant
        await this.findById(consultationId, tenantId);

        const result = await pool.query(
            `INSERT INTO prescriptions
                (id, consultation_id, medication_code, medication_display,
                 dosage, frequency, route, duration_days, instructions,
                 status, created_at, updated_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                id, consultationId,
                dto.medication_code ?? null,
                dto.medication_display,
                dto.dosage,
                dto.frequency,
                dto.route ?? null,
                dto.duration_days ?? null,
                dto.instructions ?? null,
                'active',
                now, now, tenantId
            ]
        );

        return result.rows[0];
    }

    async listPrescriptions(
        consultationId: string,
        tenantId: string
    ): Promise<LocalPrescription[]> {
        const result = await pool.query(
            `SELECT * FROM prescriptions
             WHERE consultation_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC`,
            [consultationId, tenantId]
        );
        return result.rows;
    }

    async updatePrescription(
        id: string,
        dto: UpdatePrescriptionDTO,
        tenantId: string
    ): Promise<LocalPrescription> {
        const fields: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (dto.dosage !== undefined) { fields.push(`dosage = $${p++}`); values.push(dto.dosage); }
        if (dto.frequency !== undefined) { fields.push(`frequency = $${p++}`); values.push(dto.frequency); }
        if (dto.route !== undefined) { fields.push(`route = $${p++}`); values.push(dto.route); }
        if (dto.duration_days !== undefined) { fields.push(`duration_days = $${p++}`); values.push(dto.duration_days); }
        if (dto.instructions !== undefined) { fields.push(`instructions = $${p++}`); values.push(dto.instructions); }
        if (dto.status !== undefined) { fields.push(`status = $${p++}`); values.push(dto.status); }

        if (fields.length === 0) throw new Error('No hay campos para actualizar');

        fields.push(`updated_at = $${p++}`);
        values.push(new Date().toISOString());

        const result = await pool.query(
            `UPDATE prescriptions
             SET ${fields.join(', ')}
             WHERE id = $${p} AND tenant_id = $${p + 1}
             RETURNING *`,
            [...values, id, tenantId]
        );

        if (result.rows.length === 0) throw new Error(`Prescripción ${id} no encontrada`);

        return result.rows[0];
    }

    // =========================================================================
    // LAB ORDERS
    // =========================================================================

    async addLabOrder(
        consultationId: string,
        dto: CreateLabOrderDTO,
        tenantId: string
    ): Promise<LocalLabOrder> {
        const id = uuidv4();
        const now = new Date().toISOString();

        // Verificar que la consulta existe
        await this.findById(consultationId, tenantId);

        const result = await pool.query(
            `INSERT INTO lab_orders
                (id, consultation_id, code, display, ordered_date,
                 specimen_type, status, created_at, updated_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [
                id, consultationId,
                dto.code,
                dto.display,
                now,
                dto.specimen_type ?? null,
                'ordered',
                now, now, tenantId
            ]
        );

        return result.rows[0];
    }

    async listLabOrders(
        consultationId: string,
        tenantId: string
    ): Promise<LocalLabOrder[]> {
        const result = await pool.query(
            `SELECT * FROM lab_orders
             WHERE consultation_id = $1 AND tenant_id = $2
             ORDER BY ordered_date DESC`,
            [consultationId, tenantId]
        );
        return result.rows;
    }

    async updateLabOrderResult(
        id: string,
        dto: UpdateLabOrderDTO,
        tenantId: string
    ): Promise<LocalLabOrder> {
        const fields: string[] = [];
        const values: any[] = [];
        let p = 1;

        if (dto.status !== undefined) { fields.push(`status = $${p++}`); values.push(dto.status); }
        if (dto.result !== undefined) { fields.push(`result = $${p++}`); values.push(dto.result); }
        if (dto.result_date !== undefined) { fields.push(`result_date = $${p++}`); values.push(dto.result_date); }

        if (fields.length === 0) throw new Error('No hay campos para actualizar');

        fields.push(`updated_at = $${p++}`);
        values.push(new Date().toISOString());

        const result = await pool.query(
            `UPDATE lab_orders
             SET ${fields.join(', ')}
             WHERE id = $${p} AND tenant_id = $${p + 1}
             RETURNING *`,
            [...values, id, tenantId]
        );

        if (result.rows.length === 0) throw new Error(`Orden de laboratorio ${id} no encontrada`);

        return result.rows[0];
    }

    // =========================================================================
    // SYNC TO MINISTRY
    // =========================================================================

    async syncToMinistry(
        consultationId: string,
        tenantId: string,
        mode: 'sandbox' | 'strict' = 'sandbox'
    ): Promise<{ success: boolean; message: string; bundleId?: string }> {
        try {
            const consultation = await this.findById(consultationId, tenantId);
            const prescriptions = await this.listPrescriptions(consultationId, tenantId);
            const labOrders = await this.listLabOrders(consultationId, tenantId);

            const consultationData: ConsultationData = {
                id: consultation.id,
                patient_id: consultation.patient_id,
                encounter_id: consultation.encounter_id,
                consultation_date: consultation.consultation_date,
                reason_for_visit: consultation.reason_for_visit,
                chief_complaint: consultation.chief_complaint,
                assessment: consultation.assessment,
                plan: consultation.plan,
                medications: prescriptions.map(p => ({
                    medication_code: p.medication_code,
                    medication_display: p.medication_display,
                    dosage: p.dosage,
                    frequency: p.frequency,
                    route: p.route
                })),
                lab_orders: labOrders.map(l => ({
                    code: l.code,
                    display: l.display,
                    ordered_date: l.ordered_date
                }))
            };

            const bundle = this.translator.toFHIRBundle(consultationData);
            const validation = await this.translator.validateBundle(bundle);

            if (!validation.valid) {
                throw new Error(`FHIR validation failed: ${validation.errors?.join(', ')}`);
            }

            if (mode === 'strict') {
                await ministryClient.post('/Bundle', bundle);
                console.log(`[Sync] Consulta ${consultationId} sincronizada al Ministerio`);
            } else {
                console.log(`[Sync - Sandbox] Bundle generado (no enviado): ${bundle.id}`);
            }

            return { success: true, message: `Synced in ${mode} mode`, bundleId: bundle.id };

        } catch (error: any) {
            console.error(`[Sync Error] ${error.message}`);
            return { success: false, message: error.message };
        }
    }
}

// ─── Singleton exportado ──────────────────────────────────────────────────────
export const consultationService = new ConsultationService();
