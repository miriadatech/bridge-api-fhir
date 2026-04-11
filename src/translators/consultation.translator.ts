import type * as fhir from 'fhir/r4';

// =============================================
// INTERFACES — JSON simple (nuestra BD)
// =============================================
export interface LocalConsultation {
    id: string;
    patient_id: string;
    consultation_code?: string;
    consultation_type: 'primera_vez' | 'control' | 'urgencia' | 'domiciliaria';
    specialty: string;

    // Médico e institución
    doctor_name: string;
    doctor_license?: string;
    institution_name?: string;
    institution_code?: string;

    // Fechas
    consultation_date: Date | string;
    next_appointment?: Date | string | null;

    // Clínica
    reason: string;
    symptoms?: string;
    diagnosis_code?: string;   // CIE-10
    diagnosis_desc?: string;
    treatment_plan?: string;
    notes?: string;

    // Signos vitales
    weight_kg?: number;
    height_cm?: number;
    temperature_c?: number;
    blood_pressure?: string;
    heart_rate?: number;
    oxygen_saturation?: number;

    // Control
    status: 'scheduled' | 'completed' | 'cancelled';
    ministry_synced: boolean;
    ministry_fhir_id?: string;
    active: boolean;
    created_at?: Date | string;
    updated_at?: Date | string;

    // Relaciones (opcionales, cuando se cargan con JOIN)
    prescriptions?: LocalPrescription[];
    lab_orders?: LocalLabOrder[];

    // Datos del paciente (JOIN)
    patient_identifier_type?: string;
    patient_identifier_value?: string;
    patient_full_name?: string;
}

export interface LocalPrescription {
    id: string;
    consultation_id: string;
    patient_id: string;
    medication_name: string;
    medication_code?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    route?: 'oral' | 'intravenosa' | 'intramuscular' | 'topica' | 'sublingual' | 'inhalatoria';
    instructions?: string;
    ministry_synced: boolean;
    ministry_fhir_id?: string;
    active: boolean;
    created_at?: Date | string;
}

export interface LocalLabOrder {
    id: string;
    consultation_id: string;
    patient_id: string;
    exam_name: string;
    exam_code?: string;
    exam_type?: 'laboratorio' | 'imagen' | 'patologia' | 'otro';
    priority: 'urgent' | 'routine';
    instructions?: string;
    result?: string;
    result_date?: Date | string | null;
    status: 'pending' | 'completed' | 'cancelled';
    ministry_synced: boolean;
    ministry_fhir_id?: string;
    active: boolean;
    created_at?: Date | string;
}

// =============================================
// MAPEOS FHIR
// =============================================
const CONSULTATION_TYPE_MAP: Record<string, fhir.Coding> = {
    primera_vez: {
        system: 'http://snomed.info/sct',
        code: '11429006',
        display: 'Consultation - action'
    },
    control: {
        system: 'http://snomed.info/sct',
        code: '390906007',
        display: 'Follow-up encounter'
    },
    urgencia: {
        system: 'http://snomed.info/sct',
        code: '50849002',
        display: 'Emergency room admission'
    },
    domiciliaria: {
        system: 'http://snomed.info/sct',
        code: '439708006',
        display: 'Home visit'
    }
};

const STATUS_MAP: Record<string, fhir.Encounter['status']> = {
    scheduled: 'planned',
    completed: 'finished',
    cancelled: 'cancelled'
};

const ROUTE_MAP: Record<string, fhir.Coding> = {
    oral: { system: 'http://snomed.info/sct', code: '26643006', display: 'Oral route' },
    intravenosa: { system: 'http://snomed.info/sct', code: '47625008', display: 'Intravenous route' },
    intramuscular: { system: 'http://snomed.info/sct', code: '78421000', display: 'Intramuscular route' },
    topica: { system: 'http://snomed.info/sct', code: '6064005', display: 'Topical route' },
    sublingual: { system: 'http://snomed.info/sct', code: '37839007', display: 'Sublingual route' },
    inhalatoria: { system: 'http://snomed.info/sct', code: '18679011000001101', display: 'Inhalation route' }
};

// =============================================
// CONSULTATION TRANSLATOR
// =============================================
export class ConsultationTranslator {

    // ------------------------------------------
    // Consulta → FHIR Encounter
    // ------------------------------------------
    static toFHIREncounter(consultation: LocalConsultation): fhir.Encounter {
        const encounter: fhir.Encounter = {
            resourceType: 'Encounter',
            id: consultation.ministry_fhir_id || consultation.id,
            status: STATUS_MAP[consultation.status] || 'finished',

            class: {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                code: consultation.consultation_type === 'urgencia' ? 'EMER' : 'AMB',
                display: consultation.consultation_type === 'urgencia' ? 'Emergency' : 'Ambulatory'
            },

            type: [
                {
                    coding: [CONSULTATION_TYPE_MAP[consultation.consultation_type]],
                    text: consultation.consultation_type
                }
            ],

            subject: {
                reference: `Patient/${consultation.patient_id}`
            },

            participant: [
                {
                    type: [
                        {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                                    code: 'PPRF',
                                    display: 'Primary performer'
                                }
                            ]
                        }
                    ],
                    individual: {
                        display: consultation.doctor_name,
                        ...(consultation.doctor_license && {
                            identifier: {
                                system: 'https://www.minsalud.gov.co/registro-medico',
                                value: consultation.doctor_license
                            }
                        })
                    }
                }
            ],

            period: {
                start: new Date(consultation.consultation_date).toISOString(),
                ...(consultation.next_appointment && {
                    end: new Date(consultation.next_appointment).toISOString()
                })
            },

            reasonCode: [
                {
                    text: consultation.reason,
                    ...(consultation.symptoms && {
                        coding: [
                            {
                                system: 'http://snomed.info/sct',
                                display: consultation.symptoms
                            }
                        ]
                    })
                }
            ],

            ...(consultation.institution_name && {
                serviceProvider: {
                    display: consultation.institution_name,
                    ...(consultation.institution_code && {
                        identifier: {
                            system: 'https://www.supersalud.gov.co/REPS',
                            value: consultation.institution_code
                        }
                    })
                }
            }),

            ...(consultation.notes && {
                text: {
                    status: 'generated',
                    div: `<div xmlns="http://www.w3.org/1999/xhtml">${consultation.notes}</div>`
                }
            }),

            meta: {
                profile: ['http://hl7.org/fhir/StructureDefinition/Encounter'],
                lastUpdated: new Date().toISOString()
            }
        };

        return encounter;
    }

    // ------------------------------------------
    // Diagnóstico → FHIR Condition
    // ------------------------------------------
    static toFHIRCondition(consultation: LocalConsultation): fhir.Condition | null {
        if (!consultation.diagnosis_code && !consultation.diagnosis_desc) return null;

        const condition: fhir.Condition = {
            resourceType: 'Condition',
            id: `condition-${consultation.id}`,

            clinicalStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        code: 'active',
                        display: 'Active'
                    }
                ]
            },

            verificationStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                        code: 'confirmed',
                        display: 'Confirmed'
                    }
                ]
            },

            code: {
                coding: consultation.diagnosis_code
                    ? [
                        {
                            system: 'http://hl7.org/fhir/sid/icd-10',
                            code: consultation.diagnosis_code,
                            display: consultation.diagnosis_desc || consultation.diagnosis_code
                        }
                    ]
                    : [],
                text: consultation.diagnosis_desc || consultation.diagnosis_code
            },

            subject: {
                reference: `Patient/${consultation.patient_id}`
            },

            encounter: {
                reference: `Encounter/${consultation.ministry_fhir_id || consultation.id}`
            },

            onsetDateTime: new Date(consultation.consultation_date).toISOString(),

            note: consultation.treatment_plan
                ? [{ text: consultation.treatment_plan }]
                : undefined,

            meta: {
                profile: ['http://hl7.org/fhir/StructureDefinition/Condition'],
                lastUpdated: new Date().toISOString()
            }
        };

        return condition;
    }

    // ------------------------------------------
    // Medicamento → FHIR MedicationRequest
    // ------------------------------------------
    static toFHIRMedicationRequest(
        prescription: LocalPrescription,
        patientId: string,
        encounterId: string
    ): fhir.MedicationRequest {
        const medRequest: fhir.MedicationRequest = {
            resourceType: 'MedicationRequest',
            id: prescription.ministry_fhir_id || prescription.id,
            status: prescription.active ? 'active' : 'stopped',
            intent: 'order',

            medicationCodeableConcept: {
                coding: prescription.medication_code
                    ? [
                        {
                            system: 'https://www.invima.gov.co/CUM',
                            code: prescription.medication_code,
                            display: prescription.medication_name
                        }
                    ]
                    : [],
                text: prescription.medication_name
            },

            subject: {
                reference: `Patient/${patientId}`
            },

            encounter: {
                reference: `Encounter/${encounterId}`
            },

            dosageInstruction: [
                {
                    text: [
                        prescription.dosage,
                        prescription.frequency,
                        prescription.duration
                    ]
                        .filter(Boolean)
                        .join(' - '),

                    ...(prescription.route && {
                        route: {
                            coding: [ROUTE_MAP[prescription.route]],
                            text: prescription.route
                        }
                    }),

                    ...(prescription.dosage && {
                        doseAndRate: [
                            {
                                doseQuantity: {
                                    value: parseFloat(prescription.dosage) || 0,
                                    unit: prescription.dosage.replace(/[0-9.]/g, '').trim() || 'unidad'
                                }
                            }
                        ]
                    }),

                    patientInstruction: prescription.instructions || undefined
                }
            ],

            meta: {
                profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest'],
                lastUpdated: new Date().toISOString()
            }
        };

        return medRequest;
    }

    // ------------------------------------------
    // Examen → FHIR ServiceRequest
    // ------------------------------------------
    static toFHIRServiceRequest(
        labOrder: LocalLabOrder,
        patientId: string,
        encounterId: string
    ): fhir.ServiceRequest {
        const serviceRequest: fhir.ServiceRequest = {
            resourceType: 'ServiceRequest',
            id: labOrder.ministry_fhir_id || labOrder.id,
            status: labOrder.status === 'pending'
                ? 'active'
                : labOrder.status === 'completed'
                    ? 'completed'
                    : 'revoked',
            intent: 'order',
            priority: labOrder.priority === 'urgent' ? 'urgent' : 'routine',

            code: {
                coding: labOrder.exam_code
                    ? [
                        {
                            system: 'https://www.minsalud.gov.co/CUPS',
                            code: labOrder.exam_code,
                            display: labOrder.exam_name
                        }
                    ]
                    : [],
                text: labOrder.exam_name
            },

            subject: {
                reference: `Patient/${patientId}`
            },

            encounter: {
                reference: `Encounter/${encounterId}`
            },

            note: labOrder.instructions
                ? [{ text: labOrder.instructions }]
                : undefined,

            meta: {
                profile: ['http://hl7.org/fhir/StructureDefinition/ServiceRequest'],
                lastUpdated: new Date().toISOString()
            }
        };

        return serviceRequest;
    }

    // ------------------------------------------
    // Signos vitales → FHIR Observation[]
    // ------------------------------------------
    static toFHIRVitalSigns(
        consultation: LocalConsultation,
        patientId: string
    ): fhir.Observation[] {
        const observations: fhir.Observation[] = [];
        const encounterId = consultation.ministry_fhir_id || consultation.id;
        const effectiveDate = new Date(consultation.consultation_date).toISOString();

        const baseObs = (): Partial<fhir.Observation> => ({
            resourceType: 'Observation',
            status: 'final',
            category: [
                {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                            code: 'vital-signs',
                            display: 'Vital Signs'
                        }
                    ]
                }
            ],
            subject: { reference: `Patient/${patientId}` },
            encounter: { reference: `Encounter/${encounterId}` },
            effectiveDateTime: effectiveDate
        });

        // Peso
        if (consultation.weight_kg) {
            observations.push({
                ...baseObs() as fhir.Observation,
                id: `obs-weight-${consultation.id}`,
                code: {
                    coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }]
                },
                valueQuantity: { value: consultation.weight_kg, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' }
            });
        }

        // Talla
        if (consultation.height_cm) {
            observations.push({
                ...baseObs() as fhir.Observation,
                id: `obs-height-${consultation.id}`,
                code: {
                    coding: [{ system: 'http://loinc.org', code: '8302-2', display: 'Body height' }]
                },
                valueQuantity: { value: consultation.height_cm, unit: 'cm', system: 'http://unitsofmeasure.org', code: 'cm' }
            });
        }

        // Temperatura
        if (consultation.temperature_c) {
            observations.push({
                ...baseObs() as fhir.Observation,
                id: `obs-temp-${consultation.id}`,
                code: {
                    coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }]
                },
                valueQuantity: { value: consultation.temperature_c, unit: 'Cel', system: 'http://unitsofmeasure.org', code: 'Cel' }
            });
        }

        // Frecuencia cardíaca
        if (consultation.heart_rate) {
            observations.push({
                ...baseObs() as fhir.Observation,
                id: `obs-hr-${consultation.id}`,
                code: {
                    coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }]
                },
                valueQuantity: { value: consultation.heart_rate, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' }
            });
        }

        // Saturación O2
        if (consultation.oxygen_saturation) {
            observations.push({
                ...baseObs() as fhir.Observation,
                id: `obs-spo2-${consultation.id}`,
                code: {
                    coding: [{ system: 'http://loinc.org', code: '59408-5', display: 'Oxygen saturation' }]
                },
                valueQuantity: { value: consultation.oxygen_saturation, unit: '%', system: 'http://unitsofmeasure.org', code: '%' }
            });
        }

        // Presión arterial
        if (consultation.blood_pressure) {
            const [systolic, diastolic] = consultation.blood_pressure
                .split('/')
                .map(Number);

            observations.push({
                ...baseObs() as fhir.Observation,
                id: `obs-bp-${consultation.id}`,
                code: {
                    coding: [{ system: 'http://loinc.org', code: '55284-4', display: 'Blood pressure' }]
                },
                component: [
                    {
                        code: {
                            coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }]
                        },
                        valueQuantity: { value: systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
                    },
                    {
                        code: {
                            coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }]
                        },
                        valueQuantity: { value: diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
                    }
                ]
            });
        }

        return observations;
    }

    // ------------------------------------------
    // FHIR Encounter → JSON simple
    // ------------------------------------------
    static fromFHIR(encounter: fhir.Encounter): Partial<LocalConsultation> {
        const STATUS_REVERSE: Record<string, LocalConsultation['status']> = {
            planned: 'scheduled',
            finished: 'completed',
            cancelled: 'cancelled'
        };

        return {
            ministry_fhir_id: encounter.id,
            status: STATUS_REVERSE[encounter.status] || 'completed',
            consultation_date: encounter.period?.start
                ? new Date(encounter.period.start)
                : new Date(),
            next_appointment: encounter.period?.end
                ? new Date(encounter.period.end)
                : null,
            reason: encounter.reasonCode?.[0]?.text || '',
            doctor_name: encounter.participant?.[0]?.individual?.display || '',
            doctor_license: encounter.participant?.[0]?.individual?.identifier?.value,
            institution_name: encounter.serviceProvider?.display,
            institution_code: encounter.serviceProvider?.identifier?.value,
            notes: encounter.text?.div
                ?.replace(/<[^>]*>/g, '')
                .trim()
        };
    }

    // ------------------------------------------
    // Respuesta simple para el cliente
    // ------------------------------------------
    static toSimpleResponse(consultation: LocalConsultation) {
        return {
            id: consultation.id,
            patient_id: consultation.patient_id,
            consultation_code: consultation.consultation_code,
            consultation_type: consultation.consultation_type,
            specialty: consultation.specialty,
            doctor_name: consultation.doctor_name,
            institution_name: consultation.institution_name,
            consultation_date: consultation.consultation_date,
            next_appointment: consultation.next_appointment,
            reason: consultation.reason,
            diagnosis: consultation.diagnosis_code
                ? {
                    code: consultation.diagnosis_code,
                    description: consultation.diagnosis_desc
                }
                : null,
            vital_signs: {
                weight_kg: consultation.weight_kg || null,
                height_cm: consultation.height_cm || null,
                temperature_c: consultation.temperature_c || null,
                blood_pressure: consultation.blood_pressure || null,
                heart_rate: consultation.heart_rate || null,
                oxygen_saturation: consultation.oxygen_saturation || null
            },
            status: consultation.status,
            ministry_synced: consultation.ministry_synced,
            prescriptions: consultation.prescriptions || [],
            lab_orders: consultation.lab_orders || []
        };
    }
}
