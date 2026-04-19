// src/services/RDAService.ts
// v3.0 — estructura de llaves balanceada, método estático, ruta correcta

import pool from '../config/database';
import { RDAPatientStatementTranslator } from '../translators/RDAPatientStatementTranslator';
import type { RDAPatientStatementInput } from '../translators/RDAPatientStatementTranslator';

export class RDAService {

    // =========================================================================
    // generatePatientStatement(tenantId, consultationId)
    // patientId se obtiene internamente desde medical_consultations
    // =========================================================================
    async generatePatientStatement(
        tenantId: string,
        consultationId: string,
    ): Promise<object> {

        // ── 1. Consulta + datos del tenant ────────────────────────────────────
        const consultResult = await pool.query(
            `SELECT
                mc.*,
                t.name             AS tenant_name,
                t.nit              AS tenant_nit,
                t.institution_code AS tenant_institution_code
             FROM medical_consultations mc
             JOIN tenants t ON t.id = mc.tenant_id
             WHERE mc.id        = $1
               AND mc.tenant_id = $2
               AND mc.active    = true`,
            [consultationId, tenantId],
        );

        if (consultResult.rows.length === 0) {
            throw new Error(
                `Consultation ${consultationId} not found for tenant ${tenantId}`,
            );
        }

        const consult = consultResult.rows[0];

        // ── 2. Paciente ───────────────────────────────────────────────────────
        const patResult = await pool.query(
            `SELECT
                id,
                given_name,
                family_name,
                father_family_name,
                mother_family_name,
                middle_name,
                gender,
                birth_date,
                birth_time,
                identifier_type,
                identifier_value,
                address_city,
                divipola_code,
                residence_zone_code,
                nationality_code,
                ethnicity_code,
                disability_code,
                gender_identity_code,
                biological_gender_code,
                deceased
             FROM patients
             WHERE id        = $1
               AND tenant_id = $2
               AND is_active = true
               AND deleted_at IS NULL`,
            [consult.patient_id, tenantId],
        );

        if (patResult.rows.length === 0) {
            throw new Error(`Patient ${consult.patient_id} not found`);
        }

        const pat = patResult.rows[0];

        // ── 3. Condiciones/diagnósticos ───────────────────────────────────────
        let conditions: any[] = [];
        try {
            const r = await pool.query(
                `SELECT id, condition_code, condition_display,
                        clinical_status, condition_category
                 FROM conditions
                 WHERE patient_id = $1
                   AND tenant_id  = $2
                   AND is_active  = true`,
                [consult.patient_id, tenantId],
            );
            conditions = r.rows;
        } catch {
            if (consult.diagnosis_code || consult.diagnosis_desc) {
                conditions = [{
                    id: consult.id,
                    condition_code: consult.diagnosis_code ?? undefined,
                    condition_display: consult.diagnosis_desc ?? 'Sin especificar',
                    clinical_status: 'active',
                    condition_category: 'encounter-diagnosis',
                }];
            }
        }

        // ── 4. Alergias ───────────────────────────────────────────────────────
        let allergies: any[] = [];
        try {
            const r = await pool.query(
                `SELECT id, allergen, allergen_type,
                        allergen_type_code, status
                 FROM allergies
                 WHERE patient_id = $1
                   AND tenant_id  = $2
                   AND is_active  = true`,
                [consult.patient_id, tenantId],
            );
            allergies = r.rows;
        } catch {
            allergies = [];
        }

        // ── 5. Antecedentes familiares ────────────────────────────────────────
        let familyHistory: any[] = [];
        try {
            const r = await pool.query(
                `SELECT id, relationship_code, relationship_display,
                        condition_code, condition_display, status
                 FROM family_history
                 WHERE patient_id = $1
                   AND tenant_id  = $2
                   AND is_active  = true`,
                [consult.patient_id, tenantId],
            );
            familyHistory = r.rows;
        } catch {
            familyHistory = [];
        }

        // ── 6. Medicamentos (prescripciones) ──────────────────────────────────
        let medications: any[] = [];
        try {
            const r = await pool.query(
                `SELECT
                    id,
                    medication_name AS generic_name,
                    medication_code,
                    NULL            AS brand_name,
                    'active'        AS status
                 FROM prescriptions
                 WHERE consultation_id = $1
                   AND tenant_id       = $2
                   AND active          = true
                   AND deleted_at IS NULL`,
                [consultationId, tenantId],
            );
            medications = r.rows;
        } catch {
            medications = [];
        }

        // ── 7. Construir input tipado ─────────────────────────────────────────
        const input: RDAPatientStatementInput = {
            patient: {
                id: pat.id,
                identifier_type: pat.identifier_type ?? 'CC',
                identifier_value: pat.identifier_value,
                given_name: pat.given_name,
                middle_name: pat.middle_name ?? undefined,
                family_name: pat.family_name,
                father_family_name: pat.father_family_name ?? undefined,
                mother_family_name: pat.mother_family_name ?? undefined,
                gender: pat.gender,
                birth_date: pat.birth_date instanceof Date
                    ? pat.birth_date.toISOString().split('T')[0]
                    : pat.birth_date,
                birth_time: pat.birth_time ?? undefined,
                address_city: pat.address_city ?? undefined,
                divipola_code: pat.divipola_code ?? undefined,
                residence_zone_code: pat.residence_zone_code ?? undefined,
                nationality_code: pat.nationality_code ?? '170',
                ethnicity_code: pat.ethnicity_code ?? undefined,
                disability_code: pat.disability_code ?? undefined,
                gender_identity_code: pat.gender_identity_code ?? undefined,
                biological_gender_code: pat.biological_gender_code ?? undefined,
                deceased: pat.deceased ?? false,
            },
            tenant: {
                id: tenantId,
                name: consult.tenant_name,
                nit: consult.tenant_nit ?? undefined,
                institution_code: consult.tenant_institution_code
                    ?? consult.institution_code
                    ?? 'SIN_CODIGO',
            },
            practitioner: {
                doctor_name: consult.doctor_name ?? 'Médico sin nombre',
                doctor_license: consult.doctor_license ?? undefined,
                consultation_date: consult.consultation_date ?? new Date(),
            },
            conditions,
            allergies,
            familyHistory,
            medications,
            eventStart: consult.consultation_date ?? new Date(),
            eventEnd: consult.consultation_date ?? new Date(),
        };

        // ── 8. Traducir → FHIR R4 Bundle (método ESTÁTICO) ───────────────────
        return RDAPatientStatementTranslator.translate(input);
    }

    // =========================================================================
    // syncToMinistry(tenantId, consultationId, mode)
    // =========================================================================
    async syncToMinistry(
        tenantId: string,
        consultationId: string,
        mode: 'sandbox' | 'strict' = 'sandbox',
    ): Promise<{
        success: boolean;
        bundle?: object;
        error?: string;
        logId?: string;
    }> {
        const { v4: uuidv4 } = require('uuid') as typeof import('uuid');
        const logId = uuidv4();

        try {
            const bundle = await this.generatePatientStatement(
                tenantId,
                consultationId,
            );

            // ── Sandbox ───────────────────────────────────────────────────────
            if (mode === 'sandbox') {
                await pool.query(
                    `UPDATE medical_consultations
                     SET fhir_bundle     = $1,
                         sync_status     = 'sandbox_ok',
                         synced_at       = NOW(),
                         ministry_synced = false,
                         updated_at      = NOW()
                     WHERE id        = $2
                       AND tenant_id = $3`,
                    [JSON.stringify(bundle), consultationId, tenantId],
                );

                await pool.query(
                    `INSERT INTO ministry_sync_logs
                         (id, tenant_id, resource_type, resource_id,
                          status, fhir_payload, created_at, updated_at)
                     VALUES ($1, $2, 'Consultation', $3, 'pending', $4,
                             NOW(), NOW())`,
                    [logId, tenantId, consultationId, JSON.stringify(bundle)],
                );

                return { success: true, bundle, logId };
            }

            // ── Strict: transmitir a MinSalud ─────────────────────────────────
            // CORRECCIÓN TS2307: ruta ../utils/ministryClient (no integrations)
            const { ministryClient } = await import('../utils/ministryClient');

            const tenantCredsResult = await pool.query(
                `SELECT ministry_client_id, ministry_client_secret,
                        ministry_auth_url, ministry_scope, ministry_api_url
                 FROM tenants
                 WHERE id = $1`,
                [tenantId],
            );

            const creds = tenantCredsResult.rows[0];

            if (!creds?.ministry_client_id) {
                throw new Error('Tenant sin credenciales MinSalud configuradas');
            }

            const httpClient = await ministryClient(creds);
            const response = await httpClient.post('/fhir/Bundle', bundle);

            await pool.query(
                `UPDATE medical_consultations
                 SET fhir_bundle     = $1,
                     sync_status     = 'synced',
                     synced_at       = NOW(),
                     ministry_synced = true,
                     updated_at      = NOW()
                 WHERE id        = $2
                   AND tenant_id = $3`,
                [JSON.stringify(bundle), consultationId, tenantId],
            );

            await pool.query(
                `INSERT INTO ministry_sync_logs
                     (id, tenant_id, resource_type, resource_id, status,
                      http_status_code, ministry_response, fhir_payload,
                      created_at, updated_at)
                 VALUES ($1, $2, 'Consultation', $3, 'success',
                         $4, $5, $6, NOW(), NOW())`,
                [
                    logId,
                    tenantId,
                    consultationId,
                    response.status,
                    JSON.stringify(response.data),
                    JSON.stringify(bundle),
                ],
            );

            return { success: true, bundle, logId };

        } catch (err: any) {
            const msg: string = err?.message ?? 'Unknown error';

            await pool.query(
                `INSERT INTO ministry_sync_logs
                     (id, tenant_id, resource_type, resource_id,
                      status, error_message, created_at, updated_at)
                 VALUES ($1, $2, 'Consultation', $3, 'failed', $4,
                         NOW(), NOW())`,
                [logId, tenantId, consultationId, msg],
            ).catch(() => { });

            await pool.query(
                `UPDATE medical_consultations
                 SET sync_status = 'error',
                     updated_at  = NOW()
                 WHERE id        = $1
                   AND tenant_id = $2`,
                [consultationId, tenantId],
            ).catch(() => { });

            return { success: false, error: msg, logId };
        }
    }
}

export default new RDAService();
