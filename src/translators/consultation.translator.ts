// src/translators/consultation.translator.ts

import { fhirValidator, ValidationResult } from '../validators/fhir.validator';

// ─── Interfaces de entrada ────────────────────────────────────────────────────

export interface MedicationData {
    medication_code?: string;
    medication_display: string;
    dosage: string;
    frequency: string;
    route?: string;
}

export interface LabOrderData {
    code: string;
    display: string;
    ordered_date: string;
}

export interface ConsultationData {
    id: string;
    patient_id: string;
    encounter_id: string;
    consultation_date: string;
    reason_for_visit: string;
    chief_complaint?: string;
    assessment?: string;
    plan?: string;
    medications: MedicationData[];
    lab_orders: LabOrderData[];
}

// ─── Interfaces FHIR R4 ───────────────────────────────────────────────────────

interface FHIRCoding {
    system?: string;
    code?: string;
    display?: string;
}

interface FHIRCodeableConcept {
    coding?: FHIRCoding[];
    text?: string;
}

interface FHIRReference {
    reference: string;
}

interface FHIRDosageInstruction {
    text?: string;
    route?: FHIRCodeableConcept;
    timing?: {
        repeat?: {
            frequency?: number;
            period?: number;
            periodUnit?: string;
        };
    };
    additionalInstruction?: FHIRCodeableConcept[];
}

interface FHIRPatientResource {
    resourceType: 'Patient';
    id: string;
    identifier: Array<{
        system: string;
        value: string;
    }>;
    name: Array<{
        use: string;
        text: string;
    }>;
}

interface FHIREncounterResource {
    resourceType: 'Encounter';
    id: string;
    status: string;
    class: {
        system: string;
        code: string;
        display: string;
    };
    subject: FHIRReference;
    period?: {
        start: string;
    };
    reasonCode?: FHIRCodeableConcept[];
    extension?: Array<{
        url: string;
        valueString?: string;
    }>;
}

interface FHIRConditionResource {
    resourceType: 'Condition';
    id: string;
    subject: FHIRReference;
    encounter: FHIRReference;
    code: FHIRCodeableConcept;
    note?: Array<{ text: string }>;
    recordedDate?: string;
}

interface FHIRMedicationRequestResource {
    resourceType: 'MedicationRequest';
    id: string;
    status: string;
    intent: string;
    subject: FHIRReference;
    encounter: FHIRReference;
    medicationCodeableConcept: FHIRCodeableConcept;
    dosageInstruction?: FHIRDosageInstruction[];
    authoredOn?: string;
}

interface FHIRServiceRequestResource {
    resourceType: 'ServiceRequest';
    id: string;
    status: string;
    intent: string;
    subject: FHIRReference;
    encounter: FHIRReference;
    code: FHIRCodeableConcept;
    occurrenceDateTime?: string;
}

type FHIRResource =
    | FHIRPatientResource
    | FHIREncounterResource
    | FHIRConditionResource
    | FHIRMedicationRequestResource
    | FHIRServiceRequestResource;

interface FHIREntry {
    fullUrl: string;
    resource: FHIRResource;
    request: {
        method: string;
        url: string;
    };
}

interface FHIRBundle {
    resourceType: 'Bundle';
    id: string;
    type: string;
    timestamp: string;
    entry: FHIREntry[];
}

// ─── Sistemas de codificación ─────────────────────────────────────────────────

const SYSTEMS = {
    PATIENT_ID: 'https://www.minsalud.gov.co/fhir/sid/patient-id',
    ENCOUNTER_CLASS: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    CONDITION_CATEGORY: 'http://terminology.hl7.org/CodeSystem/condition-category',
    SNOMED: 'http://snomed.info/sct',
    LOINC: 'http://loinc.org',
    MINSALUD_MED: 'https://www.minsalud.gov.co/fhir/CodeSystem/medication-codes',
    MINSALUD_LAB: 'https://www.minsalud.gov.co/fhir/CodeSystem/lab-codes',
    ROUTE: 'http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration',
    ENCOUNTER_MODALIDAD: 'http://minsalud.gov.co/fhir/StructureDefinition/encounter-modalidad',
} as const;

// ─── Clase principal ──────────────────────────────────────────────────────────

export class ConsultationTranslator {

    // ── Entry point principal ─────────────────────────────────────────────────

    toFHIRBundle(data: ConsultationData): FHIRBundle {
        const timestamp = new Date().toISOString();

        const entries: FHIREntry[] = [
            this.buildPatientEntry(data),
            this.buildEncounterEntry(data),
        ];

        // Agregar Condition solo si hay assessment o chief_complaint
        if (data.assessment || data.chief_complaint) {
            entries.push(this.buildConditionEntry(data));
        }

        // Agregar MedicationRequest por cada medicamento
        data.medications.forEach((med, index) => {
            entries.push(this.buildMedicationRequestEntry(med, data, index));
        });

        // Agregar ServiceRequest por cada orden de laboratorio
        data.lab_orders.forEach((lab, index) => {
            entries.push(this.buildServiceRequestEntry(lab, data, index));
        });

        return {
            resourceType: 'Bundle',
            id: `bundle-${data.id}`,
            type: 'transaction',
            timestamp,
            entry: entries,
        };
    }

    // ── Validar Bundle generado ───────────────────────────────────────────────

    validateBundle(bundle: unknown): ValidationResult {
        return fhirValidator.validateBundle(bundle);
    }

    // ── Patient ───────────────────────────────────────────────────────────────

    private buildPatientEntry(data: ConsultationData): FHIREntry {
        const resource: FHIRPatientResource = {
            resourceType: 'Patient',
            id: data.patient_id,
            identifier: [
                {
                    system: SYSTEMS.PATIENT_ID,
                    value: data.patient_id,
                },
            ],
            name: [
                {
                    use: 'official',
                    text: `Patient/${data.patient_id}`,
                },
            ],
        };

        return {
            fullUrl: `urn:uuid:${data.patient_id}`,
            resource,
            request: {
                method: 'PUT',
                url: `Patient/${data.patient_id}`,
            },
        };
    }

    // ── Encounter ─────────────────────────────────────────────────────────────

    private buildEncounterEntry(data: ConsultationData): FHIREntry {
        const resource: FHIREncounterResource = {
            resourceType: 'Encounter',
            id: data.encounter_id,
            status: 'finished',
            class: {
                system: SYSTEMS.ENCOUNTER_CLASS,
                code: 'AMB',
                display: 'ambulatory',
            },
            subject: {
                reference: `Patient/${data.patient_id}`,
            },
            period: {
                start: data.consultation_date,
            },
            reasonCode: [
                {
                    text: data.reason_for_visit,
                },
            ],
            extension: [],
        };

        // Extensión MinSalud RDA: modalidad
        if (resource.extension) {
            resource.extension.push({
                url: SYSTEMS.ENCOUNTER_MODALIDAD,
                valueString: 'presencial',
            });
        }

        // Extensión: plan de tratamiento
        if (data.plan && resource.extension) {
            resource.extension.push({
                url: 'http://minsalud.gov.co/fhir/StructureDefinition/encounter-plan',
                valueString: data.plan,
            });
        }

        return {
            fullUrl: `urn:uuid:${data.encounter_id}`,
            resource,
            request: {
                method: 'PUT',
                url: `Encounter/${data.encounter_id}`,
            },
        };
    }

    // ── Condition (diagnóstico) ───────────────────────────────────────────────

    private buildConditionEntry(data: ConsultationData): FHIREntry {
        const conditionId = `condition-${data.id}`;

        const resource: FHIRConditionResource = {
            resourceType: 'Condition',
            id: conditionId,
            subject: {
                reference: `Patient/${data.patient_id}`,
            },
            encounter: {
                reference: `Encounter/${data.encounter_id}`,
            },
            code: {
                coding: [
                    {
                        system: SYSTEMS.SNOMED,
                        display: data.assessment ?? data.chief_complaint ?? 'Sin diagnóstico',
                    },
                ],
                text: data.assessment ?? data.chief_complaint,
            },
            recordedDate: data.consultation_date,
        };

        // Agregar nota clínica con chief_complaint
        if (data.chief_complaint) {
            resource.note = [{ text: data.chief_complaint }];
        }

        return {
            fullUrl: `urn:uuid:${conditionId}`,
            resource,
            request: {
                method: 'POST',
                url: 'Condition',
            },
        };
    }

    // ── MedicationRequest ─────────────────────────────────────────────────────

    private buildMedicationRequestEntry(
        med: MedicationData,
        data: ConsultationData,
        index: number
    ): FHIREntry {
        const medId = `med-request-${data.id}-${index}`;

        const dosageInstruction: FHIRDosageInstruction = {
            text: `${med.dosage} - ${med.frequency}`,
        };

        // Route si está disponible
        if (med.route) {
            dosageInstruction.route = {
                coding: [
                    {
                        system: SYSTEMS.ROUTE,
                        display: med.route,
                    },
                ],
                text: med.route,
            };
        }

        const resource: FHIRMedicationRequestResource = {
            resourceType: 'MedicationRequest',
            id: medId,
            status: 'active',
            intent: 'order',
            subject: {
                reference: `Patient/${data.patient_id}`,
            },
            encounter: {
                reference: `Encounter/${data.encounter_id}`,
            },
            medicationCodeableConcept: {
                coding: [
                    {
                        system: SYSTEMS.MINSALUD_MED,
                        code: med.medication_code,
                        display: med.medication_display,
                    },
                ],
                text: med.medication_display,
            },
            dosageInstruction: [dosageInstruction],
            authoredOn: data.consultation_date,
        };

        return {
            fullUrl: `urn:uuid:${medId}`,
            resource,
            request: {
                method: 'POST',
                url: 'MedicationRequest',
            },
        };
    }

    // ── ServiceRequest (laboratorio) ──────────────────────────────────────────

    private buildServiceRequestEntry(
        lab: LabOrderData,
        data: ConsultationData,
        index: number
    ): FHIREntry {
        const labId = `lab-request-${data.id}-${index}`;

        const resource: FHIRServiceRequestResource = {
            resourceType: 'ServiceRequest',
            id: labId,
            status: 'active',
            intent: 'order',
            subject: {
                reference: `Patient/${data.patient_id}`,
            },
            encounter: {
                reference: `Encounter/${data.encounter_id}`,
            },
            code: {
                coding: [
                    {
                        system: SYSTEMS.LOINC,
                        code: lab.code,
                        display: lab.display,
                    },
                ],
                text: lab.display,
            },
            occurrenceDateTime: lab.ordered_date,
        };

        return {
            fullUrl: `urn:uuid:${labId}`,
            resource,
            request: {
                method: 'POST',
                url: 'ServiceRequest',
            },
        };
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const consultationTranslator = new ConsultationTranslator();
