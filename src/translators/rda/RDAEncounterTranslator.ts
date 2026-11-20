// src/translators/rda/RDAEncounterTranslator.ts
// ─────────────────────────────────────────────────────────────────────────────
// RDA de Urgencias (CompositionEmergencyRDA) y RDA de Hospitalización
// (CompositionHospitalizationRDA) — Guía FHIR RDA MinSalud v1.0.x
//
// Ambos comparten estructura: Encounter con hospitalization (vía de ingreso,
// condición y destino al egreso), diagnósticos por rol/rank, medicamentos
// (órdenes de administración, administrados, fórmula de egreso),
// procedimientos y resultados. Urgencias agrega la sección de Triage.
// ─────────────────────────────────────────────────────────────────────────────

import {
    CS, EXT, PROFILES, NS,
    PatientInput, TenantInput, PractitionerInput, ConditionInput, AllergyInput,
    RiskFactorInput, MedicationRequestInput, MedicationAdministrationInput,
    ProcedureInput, ProcedureResultInput, ServiceRequestInput, IncapacidadInput,
    OcupacionInput, PayerInput, DocumentReferenceInput,
    buildPatient, buildOrganization, buildPractitioner, buildLocation, buildPayer,
    buildCondition, buildAllergy, buildRiskAssessment, buildMedicationRequest,
    buildMedicationAdministration, buildProcedure, buildProcedureResult,
    buildServiceRequest, buildIncapacidad, buildOcupacion, buildDocumentReference,
    section, coding, cc, frag, clean, nowISO, toDateString,
    patientId, practitionerId, locationId,
} from './common';

export type EncounterRDAKind = 'urgencias' | 'hospitalizacion';

/** Rol del diagnóstico en el encuentro (se traduce a ColombianDiagnosisRole + rank fijo) */
export type DiagnosisRole =
    | 'ingreso'          // AdmissionDiagnosis        rank 1  (obligatorio)
    | 'egreso'           // DischargeDiagnosis        rank 2  (obligatorio)
    | 'comorbilidad'     // DischargeComorbidity-1..3 rank 3-5
    | 'causa_muerte'     // CauseOfDeath              rank 6
    | 'complicacion';    // ComplicationDiagnosis     rank 7

export interface EncounterDiagnosisInput extends ConditionInput {
    role: DiagnosisRole;
    /** RIPSTipoDiagnosticoPrincipalVersion2: 01 Impresión diagnóstica, 02 Confirmado nuevo, 03 Confirmado repetido */
    diagnosis_type_code?: string;
    diagnosis_type_display?: string;
}

export interface EncounterRDAEncounter {
    encounter_id: string;               // identificador del encuentro en el HIS
    period_start: string;               // ISO-8601 con offset (ingreso)
    period_end: string;                 // ISO-8601 con offset (egreso) — obligatorio
    tech_modality_code: string;         // ColombianTechModality (01 Intramural …)
    tech_modality_display?: string;
    /** Solo hospitalización: EntornoAtencion (urgencias está fijo en 05 Institucional) */
    care_setting_code?: string;
    care_setting_display?: string;
    mipres_ambito_code?: string;        // MipresAmbitosAtencion (opcional)
    mipres_ambito_display?: string;
    external_cause_code: string;        // RIPSCausaExternaVersion2 (obligatorio)
    external_cause_display?: string;
    admit_source_code?: string;         // ViaIngreso
    admit_source_display?: string;
    discharge_disposition_code?: string; // CondicionyDestinoUsuarioEgreso
    discharge_disposition_display?: string;
    /** Código de habilitación de la IPS destino (si fue referido) */
    discharge_destination_code?: string;
    discharge_deceased_status_code?: string; // Vivo / Muerto al egreso
    discharge_deceased_status_display?: string;
}

export interface TriageInput {
    code: string;                       // ClaseTriage 01..05
    display?: string;
    datetime: string;                   // fecha/hora del triage
}

export interface EncounterRDAInput {
    patient: PatientInput;
    tenant: TenantInput;
    practitioner: PractitionerInput;    // médico que da el egreso (DischargePhysician)
    encounter: EncounterRDAEncounter;
    composition_date?: string;
    payers?: PayerInput[];
    diagnoses: EncounterDiagnosisInput[];
    triage?: TriageInput;               // obligatorio en urgencias
    allergies?: AllergyInput[];
    risk_factors?: RiskFactorInput[];
    /** Órdenes de administración de medicamentos durante la atención */
    medication_admin_requests?: MedicationRequestInput[];
    /** Medicamentos efectivamente administrados */
    medication_administrations?: MedicationAdministrationInput[];
    /** Fórmula médica al egreso */
    medication_requests?: MedicationRequestInput[];
    procedures?: ProcedureInput[];
    procedure_results?: ProcedureResultInput[];
    service_requests?: ServiceRequestInput[];
    incapacidad?: IncapacidadInput;
    ocupacion?: OcupacionInput;
    document_references?: DocumentReferenceInput[];
    /** id del RDA Paciente al que complementa (Composition.relatesTo, opcional) */
    rda_paciente_id?: string;
}

const ROLE_MAP: Record<DiagnosisRole, { code: string; display: string; sliceId: string; rank: number }> = {
    ingreso: { code: '52870002', display: 'diagnóstico de ingreso', sliceId: 'AdmissionDiagnosis', rank: 1 },
    egreso: { code: '89100005', display: 'diagnóstico final (alta)', sliceId: 'DischargeDiagnosis', rank: 2 },
    comorbilidad: { code: '398192003', display: 'comorbilidades', sliceId: 'DischargeComorbidity', rank: 3 },
    causa_muerte: { code: '16100001', display: 'diagnóstico de la causa de muerte', sliceId: 'CauseOfDeath', rank: 6 },
    complicacion: { code: '263718001', display: 'complicación', sliceId: 'ComplicationDiagnosis', rank: 7 },
};

const KIND_CONFIG = {
    urgencias: {
        compositionProfile: PROFILES.COMPOSITION_EMERGENCY,
        encounterProfile: PROFILES.ENCOUNTER_EMERGENCY,
        typeCode: '59258-4',
        typeDisplay: 'Emergency department Discharge summary',
        title: 'RDA Urgencias',
        classCode: 'EMER',
        classDisplay: 'emergency',
        serviceGroup: { code: '05', display: 'Atención inmediata' },
        payersTitle: 'Entidad(es) responsable(s) por el plan de beneficios en salud (urgencias)',
    },
    hospitalizacion: {
        compositionProfile: PROFILES.COMPOSITION_HOSPITALIZATION,
        encounterProfile: PROFILES.ENCOUNTER_HOSPITALIZATION,
        typeCode: '34105-7',
        typeDisplay: 'Hospital Discharge summary',
        title: 'RDA Hospitalización',
        classCode: 'IMP',
        classDisplay: 'inpatient encounter',
        serviceGroup: { code: '03', display: 'Internación' },
        payersTitle: 'Entidad(es) responsable(s) por el plan de beneficios en salud (Hospitalización / Internación)',
    },
} as const;

function buildDiagnosisEntries(diagnoses: EncounterDiagnosisInput[]): object[] {
    let comorbidityIdx = 0;
    const out: object[] = [];
    for (const d of diagnoses) {
        const role = ROLE_MAP[d.role];
        if (!role) continue;
        let id: string = role.sliceId;
        let rank: number = role.rank;
        if (d.role === 'comorbilidad') {
            comorbidityIdx += 1;
            if (comorbidityIdx > 3) continue; // el perfil permite máximo 3 comorbilidades
            id = `DischargeComorbidity-${comorbidityIdx}`;
            rank = 2 + comorbidityIdx;
        }
        out.push(clean({
            id,
            extension: d.diagnosis_type_code
                ? [{ url: EXT.DIAGNOSIS_TYPE, valueCoding: coding(CS.COL_DIAGNOSIS_TYPE, d.diagnosis_type_code, d.diagnosis_type_display) }]
                : undefined,
            condition: { reference: frag(`Condition-${d.id}`) },
            use: { coding: [{ system: CS.COL_DIAGNOSIS_ROLE, code: role.code, display: role.display }] },
            rank,
        }));
    }
    return out.sort((a: any, b: any) => a.rank - b.rank);
}

function buildEncounter(kind: EncounterRDAKind, input: EncounterRDAInput, refs: {
    pRef: string; prRef: string; oRef: string; locRef: string;
}): Record<string, unknown> {
    const cfg = KIND_CONFIG[kind];
    const e = input.encounter;

    const types: object[] = [
        cc(CS.COL_TECH_MODALITY, e.tech_modality_code, e.tech_modality_display),
        cc(CS.COL_SERVICE_GROUP, cfg.serviceGroup.code, cfg.serviceGroup.display),
        kind === 'urgencias'
            ? cc(CS.ENTORNO_ATENCION, '05', 'Institucional')
            : cc(CS.ENTORNO_ATENCION, e.care_setting_code ?? '05', e.care_setting_display),
    ];
    if (e.mipres_ambito_code) types.push(cc(CS.MIPRES_AMBITOS, e.mipres_ambito_code, e.mipres_ambito_display));

    const hospitalization = clean({
        extension: e.discharge_deceased_status_code
            ? [{ url: EXT.DISCHARGE_DECEASED_STATUS, valueCoding: coding(CS.COL_DISCHARGE_DECEASED, e.discharge_deceased_status_code, e.discharge_deceased_status_display) }]
            : undefined,
        admitSource: e.admit_source_code ? cc(CS.VIA_INGRESO, e.admit_source_code, e.admit_source_display) : undefined,
        destination: e.discharge_destination_code ? { reference: frag(e.discharge_destination_code) } : undefined,
        dischargeDisposition: e.discharge_disposition_code
            ? cc(CS.COL_DISCHARGE_DISP, e.discharge_disposition_code, e.discharge_disposition_display)
            : undefined,
    });

    return clean({
        resourceType: 'Encounter',
        id: 'Encounter-0',
        meta: { profile: [cfg.encounterProfile] },
        identifier: [{ id: 'EncounterIdentifier', use: 'usual', system: NS.ENCOUNTERS, value: e.encounter_id }],
        status: 'finished',
        class: { system: CS.V3_ACT_CODE, code: cfg.classCode, display: cfg.classDisplay },
        type: types,
        subject: { reference: refs.pRef },
        participant: [{
            id: 'DischargePhysician',
            type: [{ coding: [{ system: CS.V3_PARTICIPATION, code: 'DIS', display: 'discharger' }] }],
            individual: { reference: refs.prRef },
        }],
        period: { start: e.period_start, end: e.period_end },
        reasonCode: [cc(CS.RIPS_CAUSE_EXT, e.external_cause_code, e.external_cause_display)],
        diagnosis: buildDiagnosisEntries(input.diagnoses),
        hospitalization: Object.keys(hospitalization).length > 0 ? hospitalization : undefined,
        location: [{ location: { reference: refs.locRef } }],
        serviceProvider: { reference: refs.oRef },
    });
}

function buildTriage(t: TriageInput, pRef: string, encRef: string): Record<string, unknown> {
    return {
        resourceType: 'Observation',
        id: 'Observation-triage',
        meta: { profile: [PROFILES.OBSERVATION_TRIAGE] },
        status: 'final',
        code: { coding: [{ system: CS.SNOMED, code: '225390008', display: 'triaje' }], text: 'Triage' },
        subject: { reference: pRef },
        encounter: { reference: encRef },
        effectiveDateTime: t.datetime,
        valueCodeableConcept: { coding: [coding(CS.CLASE_TRIAGE, t.code, t.display)] },
    };
}

/** Recursos de organizaciones destino (IPS a la que se refiere) para que la referencia resuelva. */
function buildDestinationOrg(code: string): Record<string, unknown> {
    return buildOrganization({ institution_code: code });
}

export class RDAEncounterTranslator {

    static translate(kind: EncounterRDAKind, input: EncounterRDAInput): Record<string, unknown> {
        const cfg = KIND_CONFIG[kind];

        const pRef = frag(patientId(input.patient));
        const prRef = frag(practitionerId(input.practitioner));
        const oRef = frag(input.tenant.institution_code);
        const locRef = frag(locationId(input.tenant));
        const encRef = frag('Encounter-0');
        const ctx = { pRef, encRef, prRef };

        const diagnoses = input.diagnoses ?? [];
        const allergies = input.allergies ?? [];
        const risks = input.risk_factors ?? [];
        const admReqs = input.medication_admin_requests ?? [];
        const admins = input.medication_administrations ?? [];
        const dischargeMeds = input.medication_requests ?? [];
        const procedures = input.procedures ?? [];
        const results = input.procedure_results ?? [];
        const services = input.service_requests ?? [];
        const docs = input.document_references ?? [];
        const payers = input.payers ?? [];

        // ── Recursos ──────────────────────────────────────────────────────────
        const conditionRes = diagnoses.map(d => buildCondition(d, pRef));
        const allergyRes = allergies.map(a => buildAllergy(a, pRef, encRef));
        const riskRes = risks.map(r => buildRiskAssessment(r, pRef, encRef));
        const admReqRes = admReqs.map(m => buildMedicationRequest(m, {
            id: `MedicationRequest-adm-${m.id}`, profile: PROFILES.MEDICATION_ADMIN_REQUEST, ...ctx, intent: 'order',
        }));
        const adminRes = admins.map(m => buildMedicationAdministration(m, ctx));
        const dischargeMedRes = dischargeMeds.map(m => buildMedicationRequest(m, {
            id: `MedicationRequest-${m.id}`, profile: PROFILES.MEDICATION_REQUEST, ...ctx,
        }));
        const procRes = procedures.map(p => buildProcedure(p, ctx));
        const resultRes = results.map(r => buildProcedureResult(r, ctx));
        const serviceRes = services.map(s => buildServiceRequest(s, ctx));
        const docRes = docs.map(d => buildDocumentReference(d, pRef, oRef));
        const payerRes = payers.map(buildPayer).filter((p): p is Record<string, unknown> => p !== null);
        const triageRes = input.triage ? buildTriage(input.triage, pRef, encRef) : null;
        const incapRes = input.incapacidad ? buildIncapacidad(input.incapacidad, pRef, encRef) : null;
        const ocupRes = input.ocupacion ? buildOcupacion(input.ocupacion, pRef, encRef) : null;
        const destOrg = input.encounter.discharge_destination_code
            && input.encounter.discharge_destination_code !== input.tenant.institution_code
            ? buildDestinationOrg(input.encounter.discharge_destination_code)
            : null;

        const encounterRes = buildEncounter(kind, input, { pRef, prRef, oRef, locRef });

        // ── Secciones (todas obligatorias; vacías → emptyReason) ─────────────
        const payerRefs = [
            ...payers.filter(p => !p.private && p.eapb_code).map(p => frag(p.eapb_code as string)),
            ...(payers.some(p => p.private) ? [pRef] : []),
        ];

        const ids = (arr: Array<Record<string, unknown>>) => arr.map(r => frag(r.id as string));

        const sections: object[] = [
            section(cfg.payersTitle, '48768-6', 'Payment sources Document', payerRefs),
            section('Otros datos demográficos', '74208-0', 'Demographic information + History of occupation Document',
                ocupRes ? [frag('Observation-ocupacion')] : []),
            section('Datos incapacidad (SIPE – Sistema de Incapacidades y Prestaciones Economicas)', '105583-9', 'Worker Sick leave form',
                incapRes ? [frag('Observation-incapacidad')] : []),
            section('Historial de medicamentos', '10160-0', 'History of Medication use Narrative',
                [...ids(admReqRes), ...ids(adminRes), ...ids(dischargeMedRes)]),
            section('Historial de alergias, intolerancias y reacciones adversas', '48765-2', 'Allergies and adverse reactions Document',
                ids(allergyRes)),
            section('Historial de diagnósticos de problemas de salud', '11450-4', 'Problem list - Reported', ids(conditionRes)),
            ...(kind === 'urgencias'
                ? [section('Clasificación de triaje', '54094-8', 'Emergency department Triage note',
                    triageRes ? [frag('Observation-triage')] : [])]
                : []),
            section('Factores de riesgo', '75492-9', 'Risk assessment and screening note', ids(riskRes)),
            section('Historial de procedimientos', '47519-4', 'History of Procedures Document', ids(procRes)),
            section('Resultados del uso de las tecnologías en salud', '30954-2', 'Relevant diagnostic tests/laboratory data note', ids(resultRes)),
            section('Órdenes, prescripciones o solicitudes de servicio', '61146-1', 'Orders for services Document', ids(serviceRes)),
            section('Documentos de soporte', '55107-7', 'Addendum Document', ids(docRes)),
        ];

        const composition = clean({
            resourceType: 'Composition',
            meta: { profile: [cfg.compositionProfile] },
            status: 'final',
            type: { coding: [{ system: CS.LOINC, code: cfg.typeCode, display: cfg.typeDisplay }] },
            subject: { reference: pRef },
            encounter: { reference: encRef },
            date: input.composition_date ?? nowISO(),
            author: [{ reference: oRef }],
            title: cfg.title,
            confidentiality: 'N',
            attester: [{ mode: 'legal', party: { reference: prRef } }],
            custodian: { reference: oRef },
            relatesTo: input.rda_paciente_id
                ? [{ code: 'appends', targetIdentifier: { value: input.rda_paciente_id } }]
                : undefined,
            event: [{
                code: [
                    cc(CS.COL_SERVICE_GROUP, cfg.serviceGroup.code, cfg.serviceGroup.display),
                    cc(CS.COL_TECH_MODALITY, input.encounter.tech_modality_code, input.encounter.tech_modality_display),
                ],
                period: {
                    start: toDateString(input.encounter.period_start),
                    end: toDateString(input.encounter.period_end),
                },
            }],
            section: sections,
        });

        const wrap = (resource: object) => ({ resource });
        const entries: object[] = [
            wrap(composition),
            wrap(buildPatient(input.patient)),
            wrap(buildOrganization(input.tenant)),
            wrap(buildPractitioner(input.practitioner)),
            wrap(encounterRes),
            wrap(buildLocation(input.tenant)),
            ...(destOrg ? [wrap(destOrg)] : []),
            ...payerRes.map(wrap),
            ...conditionRes.map(wrap),
            ...(triageRes ? [wrap(triageRes)] : []),
            ...allergyRes.map(wrap),
            ...riskRes.map(wrap),
            ...admReqRes.map(wrap),
            ...adminRes.map(wrap),
            ...dischargeMedRes.map(wrap),
            ...procRes.map(wrap),
            ...resultRes.map(wrap),
            ...serviceRes.map(wrap),
            ...(incapRes ? [wrap(incapRes)] : []),
            ...(ocupRes ? [wrap(ocupRes)] : []),
            ...docRes.map(wrap),
        ];

        return {
            resourceType: 'Bundle',
            language: 'es-CO',
            type: 'document',
            entry: entries,
        };
    }
}
