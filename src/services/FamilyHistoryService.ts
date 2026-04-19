// src/services/FamilyHistoryService.ts

import pool from '../config/database';

export interface FamilyHistoryRecord {
    id?: string;
    patient_id: string;
    tenant_id: string;
    relationship_code: string;
    relationship_display: string;
    condition_code?: string;
    condition_display?: string;
    condition_system?: string;
    deceased_boolean?: boolean;
    deceased_age?: number;
    onset_age?: number;
    note?: string;
    status?: 'active' | 'inactive' | 'entered-in-error';
}

export class FamilyHistoryService {

    // ── LIST ──────────────────────────────────────────────────────────────
    async list(patientId: string, tenantId: string): Promise<FamilyHistoryRecord[]> {
        const result = await pool.query(
            `SELECT
                id, patient_id, tenant_id,
                relationship_code, relationship_display,
                condition_code, condition_display, condition_system,
                deceased_boolean, deceased_age,
                onset_age, note, status,
                created_at, updated_at
             FROM family_history
             WHERE patient_id = $1
               AND tenant_id  = $2
               AND deleted_at IS NULL
             ORDER BY created_at DESC`,
            [patientId, tenantId]
        );
        return result.rows;
    }

    // ── GET BY ID ─────────────────────────────────────────────────────────
    async getById(
        id: string,
        patientId: string,
        tenantId: string
    ): Promise<FamilyHistoryRecord> {
        const result = await pool.query(
            `SELECT *
             FROM family_history
             WHERE id         = $1
               AND patient_id = $2
               AND tenant_id  = $3
               AND deleted_at IS NULL`,
            [id, patientId, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Antecedente familiar no encontrado: ${id}`);
        }

        return result.rows[0];
    }

    // ── CREATE ────────────────────────────────────────────────────────────
    async create(data: FamilyHistoryRecord): Promise<FamilyHistoryRecord> {

        this.validateRelationshipCode(data.relationship_code);

        const result = await pool.query(
            `INSERT INTO family_history (
                patient_id, tenant_id,
                relationship_code, relationship_display,
                condition_code, condition_display, condition_system,
                deceased_boolean, deceased_age,
                onset_age, note, status
             ) VALUES (
                $1, $2, $3, $4, $5, $6,
                COALESCE($7, 'http://hl7.org/fhir/sid/icd-10'),
                COALESCE($8, false),
                $9, $10, $11,
                COALESCE($12, 'active')
             ) RETURNING *`,
            [
                data.patient_id,
                data.tenant_id,
                data.relationship_code,
                data.relationship_display,
                data.condition_code ?? null,
                data.condition_display ?? null,
                data.condition_system ?? null,
                data.deceased_boolean ?? null,
                data.deceased_age ?? null,
                data.onset_age ?? null,
                data.note ?? null,
                data.status ?? null,
            ]
        );

        return result.rows[0];
    }

    // ── UPDATE ────────────────────────────────────────────────────────────
    async update(
        id: string,
        patientId: string,
        tenantId: string,
        data: Partial<FamilyHistoryRecord>
    ): Promise<FamilyHistoryRecord> {

        if (data.relationship_code) {
            this.validateRelationshipCode(data.relationship_code);
        }

        const result = await pool.query(
            `UPDATE family_history SET
                relationship_code    = COALESCE($1, relationship_code),
                relationship_display = COALESCE($2, relationship_display),
                condition_code       = COALESCE($3, condition_code),
                condition_display    = COALESCE($4, condition_display),
                condition_system     = COALESCE($5, condition_system),
                deceased_boolean     = COALESCE($6, deceased_boolean),
                deceased_age         = COALESCE($7, deceased_age),
                onset_age            = COALESCE($8, onset_age),
                note                 = COALESCE($9, note),
                status               = COALESCE($10, status)
             WHERE id         = $11
               AND patient_id = $12
               AND tenant_id  = $13
               AND deleted_at IS NULL
             RETURNING *`,
            [
                data.relationship_code ?? null,
                data.relationship_display ?? null,
                data.condition_code ?? null,
                data.condition_display ?? null,
                data.condition_system ?? null,
                data.deceased_boolean ?? null,
                data.deceased_age ?? null,
                data.onset_age ?? null,
                data.note ?? null,
                data.status ?? null,
                id,
                patientId,
                tenantId,
            ]
        );

        if (result.rows.length === 0) {
            throw new Error(`Antecedente familiar no encontrado: ${id}`);
        }

        return result.rows[0];
    }

    // ── SOFT DELETE ───────────────────────────────────────────────────────
    async delete(
        id: string,
        patientId: string,
        tenantId: string
    ): Promise<void> {
        const result = await pool.query(
            `UPDATE family_history
             SET deleted_at = NOW(),
                 active     = false,
                 status     = 'entered-in-error'
             WHERE id         = $1
               AND patient_id = $2
               AND tenant_id  = $3
               AND deleted_at IS NULL`,
            [id, patientId, tenantId]
        );

        if (result.rowCount === 0) {
            throw new Error(`Antecedente familiar no encontrado: ${id}`);
        }
    }

    // ── BULK CREATE (útil para importar historia clínica completa) ────────
    async bulkCreate(
        patientId: string,
        tenantId: string,
        records: Omit<FamilyHistoryRecord, 'patient_id' | 'tenant_id'>[]
    ): Promise<FamilyHistoryRecord[]> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const created: FamilyHistoryRecord[] = [];

            for (const rec of records) {
                this.validateRelationshipCode(rec.relationship_code);

                const result = await client.query(
                    `INSERT INTO family_history (
                        patient_id, tenant_id,
                        relationship_code, relationship_display,
                        condition_code, condition_display, condition_system,
                        deceased_boolean, deceased_age,
                        onset_age, note, status
                     ) VALUES ($1,$2,$3,$4,$5,$6,
                       COALESCE($7,'http://hl7.org/fhir/sid/icd-10'),
                       COALESCE($8,false),$9,$10,$11,
                       COALESCE($12,'active')
                     ) RETURNING *`,
                    [
                        patientId,
                        tenantId,
                        rec.relationship_code,
                        rec.relationship_display,
                        rec.condition_code ?? null,
                        rec.condition_display ?? null,
                        rec.condition_system ?? null,
                        rec.deceased_boolean ?? null,
                        rec.deceased_age ?? null,
                        rec.onset_age ?? null,
                        rec.note ?? null,
                        rec.status ?? null,
                    ]
                );
                created.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return created;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // ── VALIDACIÓN INTERNA ────────────────────────────────────────────────
    private readonly VALID_RELATIONSHIP_CODES = new Set([
        '72705000',   // madre
        '66839005',   // padre
        '60683002',   // hijo/a
        '125677006',  // familiar primer grado
        '127849001',  // abuelo paterno
        '127850001',  // abuela paterna
        '414096000',  // colateral
        '38048003',   // tío/tía
        '127848009',  // abuelo materno
    ]);

    private validateRelationshipCode(code: string): void {
        if (!this.VALID_RELATIONSHIP_CODES.has(code)) {
            throw new Error(
                `Código de relación inválido: ${code}. ` +
                `Válidos SNOMED CT: ${[...this.VALID_RELATIONSHIP_CODES].join(', ')}`
            );
        }
    }
}
