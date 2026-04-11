// src/services/consultation.service.ts
import pool from '../config/database';
import { ministryClient } from '../clients/ministry.client';
import {
    ConsultationTranslator,
    LocalConsultation,
    LocalPrescription,
    LocalLabOrder
} from '../translators/consultation.translator';

// =============================================
// DTOs — Lo que recibe la API del cliente
// =============================================
export interface CreateConsultationDTO {
    patient_id: string;
    consultation_type: 'primera_vez' | 'control' | 'urgencia' | 'domiciliaria' | 'externa';
    specialty: string;
    doctor_name: string;
    doctor_id?: string;
    doctor_license?: string;
    institution_name?: string;
    institution_code?: string;
    consultation_date?: string;
    next_appointment?: string;
    follow_up_date?: string;
    reason: string;
    symptoms?: string;
    diagnosis_code?: string;
    diagnosis_desc?: string;
    secondary_diagnosis?: string;
    treatment_plan?: string;
    notes?: string;
    // Vitales como campos planos (compatibilidad DB)
    weight_kg?: number;
    height_cm?: number;
    temperature_c?: number;
    blood_pressure?: string;
    heart_rate?: number;
    oxygen_saturation?: number;
    respiratory_rate?: number;
    // Vitales como objeto (compatibilidad Postman)
    vital_signs?: {
        blood_pressure?: string;
        heart_rate?: number;
        temperature?: number;
        weight?: number;
        height?: number;
        oxygen_saturation?: number;
        respiratory_rate?: number;
    };
    status?: 'scheduled' | 'completed' | 'cancelled';
    prescriptions?: CreatePrescriptionDTO[];
    lab_orders?: CreateLabOrderDTO[];
}

export interface CreatePrescriptionDTO {
    medication_name: string;
    medication_code?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    route?: 'oral' | 'intravenosa' | 'intramuscular' | 'topica' | 'sublingual' | 'inhalatoria';
    instructions?: string;
}

export interface CreateLabOrderDTO {
    // Acepta tanto exam_name como test_name del body
    exam_name?: string;
    test_name?: string;
    exam_code?: string;
    test_code?: string;
    exam_type?: 'laboratorio' | 'imagen' | 'patologia' | 'otro';
    priority?: 'urgent' | 'routine';
    instructions?: string;
    notes?: string;
}

export interface UpdateConsultationDTO extends Partial<CreateConsultationDTO> { }

export interface UpdateLabOrderResultDTO {
    result: string;
    result_date?: string;
    status: 'completed' | 'cancelled';
}

// =============================================
// CONSULTATION SERVICE
// =============================================
export class ConsultationService {

    // ------------------------------------------
    // HELPER — Normalizar vital signs
    // ------------------------------------------
    private normalizeVitals(data: CreateConsultationDTO) {
        const vs = data.vital_signs;
        return {
            weight_kg: vs?.weight ?? data.weight_kg ?? null,
            height_cm: vs?.height ?? data.height_cm ?? null,
            temperature_c: vs?.temperature ?? data.temperature_c ?? null,
            blood_pressure: vs?.blood_pressure ?? data.blood_pressure ?? null,
            heart_rate: vs?.heart_rate ?? data.heart_rate ?? null,
            oxygen_saturation: vs?.oxygen_saturation ?? data.oxygen_saturation ?? null,
            respiratory_rate: vs?.respiratory_rate ?? data.respiratory_rate ?? null,
        };
    }

    // ------------------------------------------
    // HELPER — Normalizar lab order fields
    // ------------------------------------------
    private normalizeLabOrder(lab: CreateLabOrderDTO) {
        return {
            exam_name: lab.exam_name || lab.test_name || null,
            exam_code: lab.exam_code || lab.test_code || null,
            exam_type: lab.exam_type || null,
            priority: lab.priority || 'routine',
            instructions: lab.instructions || lab.notes || null,
        };
    }

    // ------------------------------------------
    // CREAR CONSULTA (con prescripciones y exámenes)
    // ------------------------------------------
    async create(data: CreateConsultationDTO): Promise<LocalConsultation> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Verificar que el paciente existe
            const patientCheck = await client.query(
                `SELECT id FROM patients WHERE id = $1 AND is_active = true`,
                [data.patient_id]
            );

            if (patientCheck.rowCount === 0) {
                throw new Error(`Paciente con id ${data.patient_id} no encontrado`);
            }

            // 2. Normalizar vitales
            const vitals = this.normalizeVitals(data);

            // 3. Insertar consulta
            const consultResult = await client.query(
                `INSERT INTO medical_consultations (
                    patient_id, consultation_type, specialty,
                    doctor_name, doctor_license, institution_name, institution_code,
                    consultation_date, next_appointment,
                    reason, symptoms, diagnosis_code, diagnosis_desc,
                    treatment_plan, notes,
                    weight_kg, height_cm, temperature_c, blood_pressure,
                    heart_rate, oxygen_saturation, status
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,
                    $8,$9,$10,$11,$12,$13,
                    $14,$15,$16,$17,$18,$19,
                    $20,$21,$22
                ) RETURNING *`,
                [
                    data.patient_id,
                    data.consultation_type,
                    data.specialty,
                    data.doctor_name,
                    data.doctor_license || null,
                    data.institution_name || null,
                    data.institution_code || null,
                    data.consultation_date
                        ? new Date(data.consultation_date)
                        : new Date(),
                    data.next_appointment || data.follow_up_date
                        ? new Date((data.next_appointment || data.follow_up_date) as string)
                        : null,
                    data.reason,
                    data.symptoms || null,
                    data.diagnosis_code || null,
                    data.diagnosis_desc || null,
                    data.treatment_plan || null,
                    data.notes || null,
                    vitals.weight_kg,
                    vitals.height_cm,
                    vitals.temperature_c,
                    vitals.blood_pressure,
                    vitals.heart_rate,
                    vitals.oxygen_saturation,
                    data.status || 'completed'
                ]
            );

            const consultation: LocalConsultation = {
                ...consultResult.rows[0],
                ministry_synced: consultResult.rows[0].ministry_synced === true,
                prescriptions: [],
                lab_orders: []
            };

            // 4. Insertar prescripciones (si vienen)
            if (data.prescriptions && data.prescriptions.length > 0) {
                for (const presc of data.prescriptions) {
                    const prescResult = await client.query(
                        `INSERT INTO prescriptions (
                            consultation_id, patient_id,
                            medication_name, medication_code,
                            dosage, frequency, duration,
                            route, instructions
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                        RETURNING *`,
                        [
                            consultation.id,
                            data.patient_id,
                            presc.medication_name,
                            presc.medication_code || null,
                            presc.dosage || null,
                            presc.frequency || null,
                            presc.duration || null,
                            presc.route || null,
                            presc.instructions || null
                        ]
                    );

                    consultation.prescriptions!.push({
                        ...prescResult.rows[0],
                        ministry_synced: prescResult.rows[0].ministry_synced === true
                    });
                }
            }

            // 5. Insertar exámenes (si vienen)
            if (data.lab_orders && data.lab_orders.length > 0) {
                for (const lab of data.lab_orders) {
                    const normalized = this.normalizeLabOrder(lab);

                    // Validar que exam_name no sea null
                    if (!normalized.exam_name) {
                        throw new Error(
                            `Cada lab_order debe tener "exam_name" o "test_name"`
                        );
                    }

                    const labResult = await client.query(
                        `INSERT INTO lab_orders (
                            consultation_id, patient_id,
                            exam_name, exam_code, exam_type,
                            priority, instructions, active
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                        RETURNING *`,
                        [
                            consultation.id,
                            data.patient_id,
                            normalized.exam_name,
                            normalized.exam_code,
                            normalized.exam_type,
                            normalized.priority,
                            normalized.instructions,
                            true
                        ]
                    );

                    consultation.lab_orders!.push({
                        ...labResult.rows[0],
                        ministry_synced: labResult.rows[0].ministry_synced === true
                    });
                }
            }

            await client.query('COMMIT');

            // 6. Sync con Ministerio (no bloquea la respuesta)
            this.syncWithMinistry(consultation).catch(err =>
                console.error(
                    `[Ministry Sync] Error en consulta ${consultation.id}:`,
                    err.message
                )
            );

            return consultation;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ------------------------------------------
    // OBTENER TODAS LAS CONSULTAS DE UN PACIENTE
    // ------------------------------------------
    async findByPatient(patientId: string): Promise<LocalConsultation[]> {
        // Verificar paciente
        const patientCheck = await pool.query(
            `SELECT id FROM patients WHERE id = $1 AND is_active = true`,
            [patientId]
        );

        if (patientCheck.rowCount === 0) {
            throw new Error(`Paciente con id ${patientId} no encontrado`);
        }

        // Consultas
        const consultResult = await pool.query(
            `SELECT * FROM medical_consultations
             WHERE patient_id = $1 AND is_active = true
             ORDER BY consultation_date DESC`,
            [patientId]
        );

        if (consultResult.rowCount === 0) return [];

        const consultationIds = consultResult.rows.map((r: any) => r.id);

        // Prescripciones de todas las consultas
        const prescResult = await pool.query(
            `SELECT * FROM prescriptions
             WHERE consultation_id = ANY($1)
             AND is_active = true
             ORDER BY created_at ASC`,
            [consultationIds]
        );

        // Exámenes de todas las consultas
        const labResult = await pool.query(
            `SELECT * FROM lab_orders
             WHERE consultation_id = ANY($1)
             AND active = true
             ORDER BY created_at ASC`,
            [consultationIds]
        );

        // Agrupar por consultation_id
        const prescMap = new Map<string, LocalPrescription[]>();
        const labMap = new Map<string, LocalLabOrder[]>();

        prescResult.rows.forEach((p: any) => {
            const list = prescMap.get(p.consultation_id) || [];
            list.push({ ...p, ministry_synced: p.ministry_synced === true });
            prescMap.set(p.consultation_id, list);
        });

        labResult.rows.forEach((l: any) => {
            const list = labMap.get(l.consultation_id) || [];
            list.push({ ...l, ministry_synced: l.ministry_synced === true });
            labMap.set(l.consultation_id, list);
        });

        return consultResult.rows.map((row: any) => ({
            ...row,
            ministry_synced: row.ministry_synced === true,
            prescriptions: prescMap.get(row.id) || [],
            lab_orders: labMap.get(row.id) || []
        }));
    }

    // ------------------------------------------
    // OBTENER UNA CONSULTA POR ID
    // ------------------------------------------
    async findById(id: string): Promise<LocalConsultation> {
        const consultResult = await pool.query(
            `SELECT * FROM medical_consultations
             WHERE id = $1 AND is_active = true`,
            [id]
        );

        if (consultResult.rowCount === 0) {
            throw new Error(`Consulta con id ${id} no encontrada`);
        }

        const row = consultResult.rows[0];

        // Prescripciones
        const prescResult = await pool.query(
            `SELECT * FROM prescriptions
             WHERE consultation_id = $1 AND is_active = true
             ORDER BY created_at ASC`,
            [id]
        );

        // Exámenes
        const labResult = await pool.query(
            `SELECT * FROM lab_orders
             WHERE consultation_id = $1 AND active = true
             ORDER BY created_at ASC`,
            [id]
        );

        return {
            ...row,
            ministry_synced: row.ministry_synced === true,
            prescriptions: prescResult.rows.map((p: any) => ({
                ...p,
                ministry_synced: p.ministry_synced === true
            })),
            lab_orders: labResult.rows.map((l: any) => ({
                ...l,
                ministry_synced: l.ministry_synced === true
            }))
        };
    }

    // ------------------------------------------
    // ACTUALIZAR CONSULTA
    // ------------------------------------------
    async update(id: string, data: UpdateConsultationDTO): Promise<LocalConsultation> {
        await this.findById(id);

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const updatable: (keyof UpdateConsultationDTO)[] = [
            'consultation_type', 'specialty',
            'doctor_name', 'doctor_license',
            'institution_name', 'institution_code',
            'consultation_date', 'next_appointment',
            'reason', 'symptoms',
            'diagnosis_code', 'diagnosis_desc',
            'treatment_plan', 'notes',
            'weight_kg', 'height_cm', 'temperature_c',
            'blood_pressure', 'heart_rate', 'oxygen_saturation',
            'status'
        ];

        for (const key of updatable) {
            if (data[key] !== undefined) {
                if (key === 'consultation_date' || key === 'next_appointment') {
                    fields.push(`${key} = $${paramIndex++}`);
                    values.push(data[key] ? new Date(data[key] as string) : null);
                } else {
                    fields.push(`${key} = $${paramIndex++}`);
                    values.push(data[key]);
                }
            }
        }

        if (fields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        const clinicalFields = [
            'diagnosis_code', 'diagnosis_desc',
            'treatment_plan', 'status'
        ];

        const hasClinicalChanges = Object.keys(data).some(k =>
            clinicalFields.includes(k)
        );

        if (hasClinicalChanges) {
            fields.push(`ministry_synced = $${paramIndex++}`);
            values.push(false);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        await pool.query(
            `UPDATE medical_consultations
             SET ${fields.join(', ')}
             WHERE id = $${paramIndex} AND is_active = true`,
            values
        );

        const updated = await this.findById(id);

        if (hasClinicalChanges) {
            this.syncWithMinistry(updated).catch(err =>
                console.error(
                    `[Ministry Sync] Error re-sync consulta ${id}:`,
                    err.message
                )
            );
        }

        return updated;
    }

    // ------------------------------------------
    // ELIMINAR CONSULTA (soft delete)
    // ------------------------------------------
    async delete(id: string): Promise<void> {
        const consultation = await this.findById(id);

        await pool.query(
            `UPDATE medical_consultations
             SET is_active = false, updated_at = NOW()
             WHERE id = $1`,
            [id]
        );

        console.log(`[ConsultationService] Consulta ${id} eliminada (soft delete)`);

        if (consultation.ministry_fhir_id && consultation.ministry_synced) {
            this.cancelAtMinistry(consultation.ministry_fhir_id).catch(err =>
                console.error(
                    `[Ministry] Error cancelando consulta en Ministerio:`,
                    err.message
                )
            );
        }
    }

    // ------------------------------------------
    // AGREGAR PRESCRIPCIÓN A CONSULTA EXISTENTE
    // ------------------------------------------
    async addPrescription(
        consultationId: string,
        data: CreatePrescriptionDTO
    ): Promise<LocalPrescription> {
        const consultation = await this.findById(consultationId);

        const result = await pool.query(
            `INSERT INTO prescriptions (
                consultation_id, patient_id,
                medication_name, medication_code,
                dosage, frequency, duration,
                route, instructions
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                consultationId,
                consultation.patient_id,
                data.medication_name,
                data.medication_code || null,
                data.dosage || null,
                data.frequency || null,
                data.duration || null,
                data.route || null,
                data.instructions || null
            ]
        );

        const prescription: LocalPrescription = {
            ...result.rows[0],
            ministry_synced: false
        };

        this.syncPrescriptionWithMinistry(prescription, consultation).catch(err =>
            console.error(
                `[Ministry Sync] Error en prescripción ${prescription.id}:`,
                err.message
            )
        );

        return prescription;
    }

    // ------------------------------------------
    // AGREGAR EXAMEN A CONSULTA EXISTENTE
    // ------------------------------------------
    async addLabOrder(
        consultationId: string,
        data: CreateLabOrderDTO
    ): Promise<LocalLabOrder> {
        const consultation = await this.findById(consultationId);
        const normalized = this.normalizeLabOrder(data);

        if (!normalized.exam_name) {
            throw new Error(`El campo "exam_name" o "test_name" es requerido`);
        }

        const result = await pool.query(
            `INSERT INTO lab_orders (
                consultation_id, patient_id,
                exam_name, exam_code, exam_type,
                priority, instructions, active
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [
                consultationId,
                consultation.patient_id,
                normalized.exam_name,
                normalized.exam_code,
                normalized.exam_type,
                normalized.priority,
                normalized.instructions,
                true
            ]
        );

        const labOrder: LocalLabOrder = {
            ...result.rows[0],
            ministry_synced: false
        };

        this.syncLabOrderWithMinistry(labOrder, consultation).catch(err =>
            console.error(
                `[Ministry Sync] Error en examen ${labOrder.id}:`,
                err.message
            )
        );

        return labOrder;
    }

    // ------------------------------------------
    // ACTUALIZAR RESULTADO DE EXAMEN
    // ------------------------------------------
    async updateLabOrderResult(
        labOrderId: string,
        data: UpdateLabOrderResultDTO
    ): Promise<LocalLabOrder> {
        const result = await pool.query(
            `UPDATE lab_orders
             SET result          = $1,
                 result_date     = $2,
                 status          = $3,
                 ministry_synced = false
             WHERE id = $4 AND active = true
             RETURNING *`,
            [
                data.result,
                data.result_date ? new Date(data.result_date) : new Date(),
                data.status,
                labOrderId
            ]
        );

        if (result.rowCount === 0) {
            throw new Error(`Examen con id ${labOrderId} no encontrado`);
        }

        return {
            ...result.rows[0],
            ministry_synced: false
        };
    }

    // ------------------------------------------
    // SYNC COMPLETO CON EL MINISTERIO
    // ------------------------------------------
    private async syncWithMinistry(consultation: LocalConsultation): Promise<void> {
        const mode = process.env.MINISTRY_MODE || 'sandbox';

        if (mode === 'disabled') {
            console.log(
                `[Ministry] Modo deshabilitado — consulta ${consultation.id} no enviada`
            );
            return;
        }

        try {
            console.log(`[Ministry] Iniciando sync consulta ${consultation.id}...`);

            const encounter = ConsultationTranslator.toFHIREncounter(consultation);
            const condition = ConsultationTranslator.toFHIRCondition(consultation);
            const vitalSigns = ConsultationTranslator.toFHIRVitalSigns(
                consultation, consultation.patient_id
            );
            const medications = (consultation.prescriptions || []).map(p =>
                ConsultationTranslator.toFHIRMedicationRequest(
                    p, consultation.patient_id, consultation.id
                )
            );
            const serviceReqs = (consultation.lab_orders || []).map(l =>
                ConsultationTranslator.toFHIRServiceRequest(
                    l, consultation.patient_id, consultation.id
                )
            );

            const bundle = {
                resourceType: 'Bundle',
                type: 'transaction',
                entry: [
                    {
                        resource: encounter,
                        request: { method: 'PUT', url: `Encounter/${encounter.id}` }
                    },
                    ...(condition ? [{
                        resource: condition,
                        request: { method: 'PUT', url: `Condition/${condition.id}` }
                    }] : []),
                    ...vitalSigns.map(obs => ({
                        resource: obs,
                        request: { method: 'PUT', url: `Observation/${obs.id}` }
                    })),
                    ...medications.map(med => ({
                        resource: med,
                        request: { method: 'PUT', url: `MedicationRequest/${med.id}` }
                    })),
                    ...serviceReqs.map(sr => ({
                        resource: sr,
                        request: { method: 'PUT', url: `ServiceRequest/${sr.id}` }
                    }))
                ]
            };

            if (mode === 'sandbox') {
                console.log(
                    `[Ministry Sandbox] Bundle FHIR consulta ${consultation.id}:`,
                    JSON.stringify(bundle, null, 2)
                );
                await pool.query(
                    `UPDATE medical_consultations
                     SET ministry_synced  = true,
                         ministry_fhir_id = $1,
                         updated_at       = NOW()
                     WHERE id = $2`,
                    [encounter.id, consultation.id]
                );
                return;
            }

            // Modo strict — enviar al Ministerio real
            const response = await ministryClient.post('/fhir/Bundle', bundle);
            const fhirId = response.data?.id || encounter.id;

            await pool.query(
                `UPDATE medical_consultations
                 SET ministry_synced  = true,
                     ministry_fhir_id = $1,
                     updated_at       = NOW()
                 WHERE id = $2`,
                [fhirId, consultation.id]
            );

            console.log(
                `[Ministry] Consulta ${consultation.id} sincronizada. FHIR ID: ${fhirId}`
            );

        } catch (error: any) {
            console.error(
                `[Ministry] Fallo sync consulta ${consultation.id}:`,
                error.message
            );
        }
    }

    // ------------------------------------------
    // SYNC PRESCRIPCIÓN INDIVIDUAL
    // ------------------------------------------
    private async syncPrescriptionWithMinistry(
        prescription: LocalPrescription,
        consultation: LocalConsultation
    ): Promise<void> {
        const mode = process.env.MINISTRY_MODE || 'sandbox';
        if (mode === 'disabled') return;

        try {
            const fhirMed = ConsultationTranslator.toFHIRMedicationRequest(
                prescription,
                consultation.patient_id,
                consultation.ministry_fhir_id || consultation.id
            );

            if (mode === 'sandbox') {
                console.log(
                    `[Ministry Sandbox] MedicationRequest:`,
                    JSON.stringify(fhirMed, null, 2)
                );
                await pool.query(
                    `UPDATE prescriptions
                     SET ministry_synced = true, ministry_fhir_id = $1
                     WHERE id = $2`,
                    [fhirMed.id, prescription.id]
                );
                return;
            }

            const response = await ministryClient.post('/fhir/MedicationRequest', fhirMed);
            await pool.query(
                `UPDATE prescriptions
                 SET ministry_synced = true, ministry_fhir_id = $1
                 WHERE id = $2`,
                [response.data?.id || fhirMed.id, prescription.id]
            );
        } catch (error: any) {
            console.error(
                `[Ministry] Fallo sync prescripción ${prescription.id}:`,
                error.message
            );
        }
    }

    // ------------------------------------------
    // SYNC EXAMEN INDIVIDUAL
    // ------------------------------------------
    private async syncLabOrderWithMinistry(
        labOrder: LocalLabOrder,
        consultation: LocalConsultation
    ): Promise<void> {
        const mode = process.env.MINISTRY_MODE || 'sandbox';
        if (mode === 'disabled') return;

        try {
            const fhirSR = ConsultationTranslator.toFHIRServiceRequest(
                labOrder,
                consultation.patient_id,
                consultation.ministry_fhir_id || consultation.id
            );

            if (mode === 'sandbox') {
                console.log(
                    `[Ministry Sandbox] ServiceRequest:`,
                    JSON.stringify(fhirSR, null, 2)
                );
                await pool.query(
                    `UPDATE lab_orders
                     SET ministry_synced = true, ministry_fhir_id = $1
                     WHERE id = $2`,
                    [fhirSR.id, labOrder.id]
                );
                return;
            }

            const response = await ministryClient.post('/fhir/ServiceRequest', fhirSR);
            await pool.query(
                `UPDATE lab_orders
                 SET ministry_synced = true, ministry_fhir_id = $1
                 WHERE id = $2`,
                [response.data?.id || fhirSR.id, labOrder.id]
            );
        } catch (error: any) {
            console.error(
                `[Ministry] Fallo sync examen ${labOrder.id}:`,
                error.message
            );
        }
    }

    // ------------------------------------------
    // CANCELAR EN MINISTERIO
    // ------------------------------------------
    private async cancelAtMinistry(fhirId: string): Promise<void> {
        const mode = process.env.MINISTRY_MODE || 'sandbox';
        if (mode !== 'strict') return;

        try {
            await ministryClient.patch(`/fhir/Encounter/${fhirId}`, {
                resourceType: 'Encounter',
                status: 'cancelled'
            });
            console.log(`[Ministry] Encounter ${fhirId} marcado como cancelado`);
        } catch (error: any) {
            console.error(
                `[Ministry] Error cancelando Encounter ${fhirId}:`,
                error.message
            );
        }
    }
}

// Singleton
export const consultationService = new ConsultationService();
