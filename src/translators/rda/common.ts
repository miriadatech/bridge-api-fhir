// src/translators/rda/common.ts
// ─────────────────────────────────────────────────────────────────────────────
// Constantes, catálogos y constructores FHIR compartidos por los RDA
// (Guía de Implementación HL7 FHIR RDA – MinSalud Colombia, v1.0.x)
//
// Convenciones del Manual de Operaciones IHCE:
//   • Bundle.type = "document", entry[0] = Composition (una sola).
//   • IDs locales: TipoRecurso-N (Encounter-0, Condition-1 …); referencias con '#'.
//   • Patient / Practitioner: #TipoDoc-Numero (#CC-123).
//   • Organization IPS: #CodigoHabilitacion. Location: #CodigoHabilitacion-Sede.
//   • EAPB: #CodigoEAPB.
//   • Todas las secciones de la Composition se envían; vacías → emptyReason nilknown.
// ─────────────────────────────────────────────────────────────────────────────

export const BASE = 'https://fhir.minsalud.gov.co/rda';

export const PROFILES = {
    PATIENT: `${BASE}/StructureDefinition/PatientRDA`,
    ORGANIZATION: `${BASE}/StructureDefinition/CareDeliveryOrganizationRDA`,
    EAPB: `${BASE}/StructureDefinition/HealthBenefitPlanAdminOrganizationRDA`,
    PRACTITIONER: `${BASE}/StructureDefinition/PractitionerRDA`,
    LOCATION: `${BASE}/StructureDefinition/CareDeliveryLocationRDA`,
    CONDITION: `${BASE}/StructureDefinition/ConditionRDA`,
    ALLERGY: `${BASE}/StructureDefinition/AllergyIntoleranceRDA`,
    RISK_ASSESSMENT: `${BASE}/StructureDefinition/RiskFactorRDA`,
    MEDICATION_REQUEST: `${BASE}/StructureDefinition/MedicationRequestRDA`,
    MEDICATION_ADMIN_REQUEST: `${BASE}/StructureDefinition/MedicationAdminRequestRDA`,
    MEDICATION_ADMINISTRATION: `${BASE}/StructureDefinition/MedicationAdministrationRDA`,
    PROCEDURE: `${BASE}/StructureDefinition/ProcedureRDA`,
    PROCEDURE_RESULT: `${BASE}/StructureDefinition/ProcedureResultRDA`,
    SERVICE_REQUEST_PROC: `${BASE}/StructureDefinition/ServiceRequestRDA`,
    SERVICE_REQUEST_OTHER: `${BASE}/StructureDefinition/OtherTechnologyServiceRequestRDA`,
    OBSERVATION_INCAP: `${BASE}/StructureDefinition/AttendanceAllowanceRDA`,
    OBSERVATION_OCUP: `${BASE}/StructureDefinition/PatientOccupationAtEncounterRDA`,
    OBSERVATION_TRIAGE: `${BASE}/StructureDefinition/ObservationTriageRDA`,
    DOCUMENT_REFERENCE: `${BASE}/StructureDefinition/DocumentReferenceEPIRDA`,
    // Composition / Encounter por tipo de RDA
    COMPOSITION_PATIENT: `${BASE}/StructureDefinition/CompositionPatientStatementRDA`,
    COMPOSITION_AMBULATORY: `${BASE}/StructureDefinition/CompositionAmbulatoryRDA`,
    COMPOSITION_EMERGENCY: `${BASE}/StructureDefinition/CompositionEmergencyRDA`,
    COMPOSITION_HOSPITALIZATION: `${BASE}/StructureDefinition/CompositionHospitalizationRDA`,
    ENCOUNTER_AMBULATORY: `${BASE}/StructureDefinition/EncounterAmbulatoryRDA`,
    ENCOUNTER_EMERGENCY: `${BASE}/StructureDefinition/EncounterEmergencyRDA`,
    ENCOUNTER_HOSPITALIZATION: `${BASE}/StructureDefinition/EncounterHospitalizationRDA`,
};

export const EXT = {
    NATIONALITY: `${BASE}/StructureDefinition/ExtensionPatientNationality`,
    ETHNICITY: `${BASE}/StructureDefinition/ExtensionPatientEthnicity`,
    DISABILITY: `${BASE}/StructureDefinition/ExtensionPatientDisability`,
    GENDER_IDENTITY: `${BASE}/StructureDefinition/ExtensionPatientGenderIdentity`,
    BIOLOGICAL_GENDER: `${BASE}/StructureDefinition/ExtensionBiologicalGender`,
    RESIDENCE_ZONE: `${BASE}/StructureDefinition/ExtensionResidenceZone`,
    DIVIPOLA_MUNICIPALITY: `${BASE}/StructureDefinition/ExtensionDivipolaMunicipality`,
    COUNTRY_CODE: `${BASE}/StructureDefinition/ExtensionCountryCode`,
    FATHERS_FAMILY_NAME: `${BASE}/StructureDefinition/ExtensionFathersFamilyName`,
    MOTHERS_FAMILY_NAME: `${BASE}/StructureDefinition/ExtensionMothersFamilyName`,
    BIRTH_TIME: `${BASE}/StructureDefinition/ExtensionBirthTime`,
    DIAGNOSIS_TYPE: `${BASE}/StructureDefinition/ExtensionDiagnosisType`,
    DISCHARGE_DECEASED_STATUS: `${BASE}/StructureDefinition/ExtensionDischargeDeceasedStatus`,
    DISPENSE_QUANTITY: `${BASE}/StructureDefinition/ExtensionMedicationDispenseQuantity`,
    SURGICAL_METHOD: `${BASE}/StructureDefinition/ExtensionSurgicalMethod`,
};

export const CS = {
    LOINC: 'http://loinc.org',
    ICD10: 'http://hl7.org/fhir/sid/icd-10',
    SNOMED: 'http://snomed.info/sct',
    UCUM: 'http://unitsofmeasure.org',
    V2_0203: 'http://terminology.hl7.org/CodeSystem/v2-0203',
    V3_ACT_CODE: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    V3_PARTICIPATION: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
    CONDITION_CLINICAL: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
    CONDITION_VERIFICATION: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
    CONDITION_CATEGORY: 'http://terminology.hl7.org/CodeSystem/condition-category',
    ALLERGY_CLINICAL: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
    CONFIDENTIALITY: 'http://terminology.hl7.org/CodeSystem/v3-Confidentiality',
    LIST_EMPTY_REASON: 'http://terminology.hl7.org/CodeSystem/list-empty-reason',
    COL_PERSON_ID: `${BASE}/CodeSystem/ColombianPersonIdentifier`,
    COL_ORG_ID: `${BASE}/CodeSystem/ColombianOrganizationIdentifiers`,
    COL_ETHNICITY: `${BASE}/CodeSystem/ColombianEthnicGroup`,
    COL_DISABILITY: `${BASE}/CodeSystem/ColombianDisabilityClassification`,
    COL_GENDER_IDENTITY: `${BASE}/CodeSystem/ColombianGenderIdentity`,
    COL_GENDER_GROUP: `${BASE}/CodeSystem/ColombianGenderGroup`,
    COL_RESIDENCE_ZONE: `${BASE}/CodeSystem/ColombianResidenceZone`,
    COL_TECH_MODALITY: `${BASE}/CodeSystem/ColombianTechModality`,
    COL_SERVICE_GROUP: `${BASE}/CodeSystem/GrupoServicios`,
    COL_ALLERGY_TYPE: `${BASE}/CodeSystem/TipoAlergia`,
    COL_DIAGNOSIS_ROLE: `${BASE}/CodeSystem/ColombianDiagnosisRole`,
    COL_DIAGNOSIS_TYPE: `${BASE}/CodeSystem/RIPSTipoDiagnosticoPrincipalVersion2`,
    COL_DISCHARGE_DISP: `${BASE}/CodeSystem/CondicionyDestinoUsuarioEgreso`,
    COL_DISCHARGE_DECEASED: `${BASE}/CodeSystem/ColombianDischargeDeceasedStatus`,
    COL_HEALTH_TECH_CAT: `${BASE}/CodeSystem/ColombianHealthTechnologyCategory`,
    COL_DOC_TYPES: `${BASE}/CodeSystem/ColombianDocumentTypes`,
    COL_LICENSE_SCOPE: `${BASE}/CodeSystem/ColombianLicenseScope`,
    COL_OCCUPATION: `${BASE}/CodeSystem/CIUO88AC`,
    COL_SURGICAL_METHOD: `${BASE}/CodeSystem/ColombianSurgicalMethod`,
    VIA_INGRESO: `${BASE}/CodeSystem/ViaIngreso`,
    CLASE_TRIAGE: `${BASE}/CodeSystem/ClaseTriage`,
    MIPRES_AMBITOS: `${BASE}/CodeSystem/MipresAmbitosAtencion`,
    REPS_SERVICES: `${BASE}/CodeSystem/REPShealthcareServices`,
    CUPS: `${BASE}/CodeSystem/CUPS`,
    RIPS_CAUSE_EXT: `${BASE}/CodeSystem/RIPSCausaExternaVersion2`,
    RIPS_FINALIDAD: `${BASE}/CodeSystem/RIPSFinalidadConsultaVersion2`,
    ENTORNO_ATENCION: `${BASE}/CodeSystem/EntornoAtencion`,
    FACTOR_RIESGO: `${BASE}/CodeSystem/FactorRiesgo`,
    IUM_PRIMER_NIVEL: `${BASE}/CodeSystem/IUMPrimerNivel`,
    MIPRES_INN: `${BASE}/CodeSystem/MipresINN`,
    MIPRES_INSTRUCTION: `${BASE}/CodeSystem/MipresSpecialInstruction`,
    MEDICATION_TIME: `${BASE}/CodeSystem/MedicationTime`,
    VAD: `${BASE}/CodeSystem/VAD`,
    UMM: `${BASE}/CodeSystem/UMM`,
    MIPRES_DISPENSE_UNIT: `${BASE}/CodeSystem/MipresDispenseUnit`,
    ISO_3166_1: `${BASE}/CodeSystem/ISO31661`,
    DIVIPOLA: `${BASE}/CodeSystem/DIVIPOLA`,
};

export const NS = {
    RNEC: `${BASE}/NamingSystem/RNEC`,
    REPS: `${BASE}/NamingSystem/REPS`,
    ENCOUNTERS: `${BASE}/NamingSystem/Encounters`,
    PRESCRIPTION: `${BASE}/NamingSystem/NumeroPrescripcion`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de displays oficiales conocidos (el Ministerio exige que el display
// coincida EXACTAMENTE). Si el HIS no envía display, se usa este catálogo.
// Para el resto de códigos, el worker puede autocorregir displays consultando
// /CodeSystem/{id} del Ministerio (ver TerminologyService, TERMINOLOGY_AUTOFIX).
// ─────────────────────────────────────────────────────────────────────────────

export const KNOWN_DISPLAYS: Record<string, Record<string, string>> = {
    [CS.COL_SERVICE_GROUP]: {
        '01': 'Consulta externa',
        '03': 'Internación',
        '05': 'Atención inmediata',
    },
    [CS.ENTORNO_ATENCION]: { '05': 'Institucional' },
    [CS.COL_RESIDENCE_ZONE]: { '01': 'Urbana', '02': 'Rural' },
    [CS.CLASE_TRIAGE]: {
        '01': 'Triage I', '02': 'Triage II', '03': 'Triage III',
        '04': 'Triage IV', '05': 'Triage V',
    },
    [CS.COL_DIAGNOSIS_ROLE]: {
        '52870002': 'diagnóstico de ingreso',
        '89100005': 'diagnóstico final (alta)',
        '398192003': 'comorbilidades',
        '16100001': 'diagnóstico de la causa de muerte',
        '263718001': 'complicación',
    },
    [CS.COL_DIAGNOSIS_TYPE]: {
        '01': 'Impresión Diagnóstica',
        '02': 'Confirmado Nuevo',
    },
    [CS.COL_PERSON_ID]: { CC: 'Cédula ciudadanía' },
};

export function display(system: string, code: string, provided?: string): string {
    if (provided && provided.trim()) return provided;
    return KNOWN_DISPLAYS[system]?.[code] ?? code;
}

export function coding(system: string, code: string, disp?: string): Record<string, string> {
    return { system, code, display: display(system, code, disp) };
}

export function cc(system: string, code: string, disp?: string, text?: string): Record<string, unknown> {
    return { coding: [coding(system, code, disp)], ...(text ? { text } : {}) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const nowISO = (): string => new Date().toISOString();

export const frag = (id: string): string => `#${id}`;

export function toDateString(value: Date | string | undefined | null): string {
    if (!value) return nowISO();
    if (typeof value === 'string') return value;
    return value.toISOString();
}

export function mapGender(g: string | undefined): string {
    const m: Record<string, string> = {
        male: 'male', m: 'male', masculino: 'male', hombre: 'male',
        female: 'female', f: 'female', femenino: 'female', mujer: 'female',
        other: 'other', otro: 'other', unknown: 'unknown', desconocido: 'unknown',
    };
    return m[(g ?? '').toString().trim().toLowerCase()] ?? 'unknown';
}

/** Elimina claves con undefined / null para no enviar elementos vacíos. */
export function clean<T>(obj: T): T {
    if (Array.isArray(obj)) return obj.map(clean).filter(v => v !== undefined) as unknown as T;
    if (obj && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (v === undefined || v === null) continue;
            const c = clean(v);
            if (Array.isArray(c) && c.length === 0) continue;
            out[k] = c;
        }
        return out as T;
    }
    return obj;
}

const HONORIFICS = new Set([
    'dr.', 'dr', 'dra.', 'dra', 'lic.', 'lic', 'mg.', 'mg', 'esp.', 'esp',
    'prof.', 'prof', 'ing.', 'ing', 'phd.', 'phd',
]);

export function decomposeName(fullName: string): { given: string[]; father: string; mother: string } {
    const raw = fullName.trim().split(/\s+/);
    const parts = raw.filter(t => !HONORIFICS.has(t.toLowerCase()));
    const p = parts.length > 0 ? parts : raw;
    if (p.length === 1) return { given: [p[0]], father: p[0], mother: '' };
    if (p.length === 2) return { given: [p[0]], father: p[1], mother: '' };
    return { given: p.slice(0, -2), father: p[p.length - 2], mother: p[p.length - 1] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de entrada comunes ("JSON normal" del HIS)
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientInput {
    identifier_type: string;             // CC | TI | CE | PA | RC | MS | AS | CN | PE | PT …
    identifier_value: string;
    given_name: string;
    middle_name?: string;
    family_name?: string;                // si no viene, se arma con father + mother
    father_family_name?: string;         // primer apellido
    mother_family_name?: string;         // segundo apellido
    gender: string;                      // male | female | other | unknown (acepta M/F)
    birth_date: string;                  // YYYY-MM-DD
    birth_time?: string;                 // HH:mm:ss
    address_city?: string;
    divipola_code?: string;
    residence_zone_code?: string;
    residence_zone_display?: string;
    nationality_code?: string;           // ISO 3166-1 numérico, Colombia = 170
    ethnicity_code?: string;
    ethnicity_display?: string;
    disability_code?: string;
    disability_display?: string;
    gender_identity_code?: string;
    gender_identity_display?: string;
    biological_gender_code?: string;
    biological_gender_display?: string;
    deceased?: boolean;
}

export interface TenantInput {
    id?: string;
    name?: string;
    nit?: string;
    institution_code: string;            // código de habilitación REPS
    sede_code?: string;                  // número de sede, por defecto "01"
    location_name?: string;
}

export interface PractitionerInput {
    doctor_name: string;
    doctor_identifier_type?: string;     // por defecto CC
    doctor_license: string;              // número de documento del profesional
}

export interface ConditionInput {
    id: string;
    condition_code?: string;             // CIE-10
    condition_display: string;
    clinical_status?: string;            // active | inactive | resolved
    verification_status?: string;        // confirmed | unconfirmed | provisional
    condition_category?: string;         // encounter-diagnosis | problem-list-item
}

export interface AllergyInput {
    id: string;
    allergen: string;
    allergen_type_code?: string;         // TipoAlergia: 01 Medicamento, 02 Alimento …
    allergen_type_display?: string;
    status?: string;                     // active | inactive | resolved
}

export interface RiskFactorInput {
    id: string;
    risk_code: string;
    risk_display: string;
    risk_text?: string;
}

export interface MedicationRequestInput {
    id: string;
    medication_code?: string;
    medication_display: string;
    /** Sistema del código: "MipresINN" (por defecto) o "IUMPrimerNivel" */
    medication_system?: 'MipresINN' | 'IUMPrimerNivel';
    category_code?: string;
    category_display?: string;
    authored_on?: string;
    reason_code?: string;
    reason_display?: string;
    reason_condition_id?: string;
    prescription_number?: string;
    dosage_text?: string;
    patient_instruction?: string;
    special_instruction_code?: string;
    special_instruction_display?: string;
    duration_days?: number;
    frequency_code?: string;
    frequency_display?: string;
    route_code?: string;
    route_display?: string;
    dose_value?: number;
    dose_unit?: string;
    dose_unit_code?: string;
    dispense_quantity_value?: number;
    dispense_quantity_unit?: string;
    dispense_unit_code?: string;
    number_of_repeats?: number;
}

export interface MedicationAdministrationInput {
    id: string;
    medication_code?: string;
    medication_display: string;
    medication_system?: 'MipresINN' | 'IUMPrimerNivel';
    effective_start: string;             // ISO-8601
    effective_end?: string;
    route_code?: string;
    route_display?: string;
    dose_value?: number;
    dose_unit?: string;
    dose_unit_code?: string;
    /** id de la orden de administración (medication_admin_requests[].id) */
    request_id?: string;
    note?: string;
}

export interface ProcedureInput {
    id: string;
    cups_code: string;
    cups_display: string;
    performed_datetime: string;
    reason_code?: string;                // RIPSFinalidadConsultaVersion2
    reason_display?: string;
    /** ids de Condition: [diagnóstico principal, relacionado] */
    main_condition_id?: string;
    related_condition_id?: string;
    surgical_method_code?: string;
    surgical_method_display?: string;
    complication_code?: string;          // CIE-10
    complication_display?: string;
}

export interface ProcedureResultInput {
    id: string;
    cups_code: string;
    cups_display: string;
    effective_datetime: string;
    procedure_id: string;                // id del procedimiento (procedures[].id) al que pertenece
    components: Array<{
        name: string;
        value_string?: string;
        value_quantity?: number;
        unit?: string;
        unit_code?: string;
    }>;
}

export interface ServiceRequestInput {
    id: string;
    category_code?: string;
    category_display?: string;
    cups_code?: string;
    cups_display?: string;
    description?: string;
    authored_on?: string;
    reason_code?: string;
    reason_display?: string;
}

export interface IncapacidadInput {
    scope_code?: string;
    scope_display?: string;
    days?: number;
}

export interface OcupacionInput {
    occupation_code: string;
    occupation_display: string;
}

export interface PayerInput {
    /** Código EAPB (ej. EPS037). Omitir si es pago particular. */
    eapb_code?: string;
    name?: string;
    nit?: string;
    /** true = pago particular (referencia al paciente) */
    private?: boolean;
}

export interface DocumentReferenceInput {
    id: string;
    loinc_code?: string;
    loinc_display?: string;
    doc_type_code?: string;
    doc_type_display?: string;
    date?: string;
    description?: string;
    /** PDF de epicrisis en base64 (opcional) */
    pdf_base64?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructores de recursos comunes
// ─────────────────────────────────────────────────────────────────────────────

export function patientId(p: PatientInput): string {
    return `${(p.identifier_type ?? 'CC').toUpperCase()}-${p.identifier_value}`;
}

export function practitionerId(pr: PractitionerInput): string {
    return `${(pr.doctor_identifier_type ?? 'CC').toUpperCase()}-${pr.doctor_license}`;
}

export function locationId(t: TenantInput): string {
    return `${t.institution_code}-${t.sede_code ?? '01'}`;
}

export function buildPatient(p: PatientInput): Record<string, unknown> {
    const idType = (p.identifier_type ?? 'CC').toUpperCase();
    const ext: object[] = [];
    if (p.nationality_code) {
        ext.push({
            url: EXT.NATIONALITY,
            valueCoding: coding(CS.ISO_3166_1, p.nationality_code, p.nationality_code === '170' ? 'Colombia' : undefined),
        });
    }
    if (p.ethnicity_code) ext.push({ url: EXT.ETHNICITY, valueCoding: coding(CS.COL_ETHNICITY, p.ethnicity_code, p.ethnicity_display) });
    if (p.disability_code) ext.push({ url: EXT.DISABILITY, valueCoding: coding(CS.COL_DISABILITY, p.disability_code, p.disability_display) });
    if (p.gender_identity_code) ext.push({ url: EXT.GENDER_IDENTITY, valueCoding: coding(CS.COL_GENDER_IDENTITY, p.gender_identity_code, p.gender_identity_display) });

    const family = [p.father_family_name, p.mother_family_name].filter(Boolean).join(' ') || p.family_name || '';
    const famExt: object[] = [];
    const father = p.father_family_name ?? (p.family_name ? p.family_name.split(/\s+/)[0] : undefined);
    const mother = p.mother_family_name ?? (p.family_name && !p.father_family_name ? p.family_name.split(/\s+/).slice(1).join(' ') || undefined : undefined);
    if (father) famExt.push({ url: EXT.FATHERS_FAMILY_NAME, valueString: father });
    if (mother) famExt.push({ url: EXT.MOTHERS_FAMILY_NAME, valueString: mother });

    const resource: Record<string, unknown> = {
        resourceType: 'Patient',
        id: patientId(p),
        meta: { profile: [PROFILES.PATIENT] },
        ...(ext.length > 0 && { extension: ext }),
        identifier: [{
            id: 'NationalPersonIdentifier-0',
            use: 'official',
            type: {
                coding: [
                    { system: CS.V2_0203, code: 'PN', display: 'Person number' },
                    coding(CS.COL_PERSON_ID, idType),
                ],
            },
            system: NS.RNEC,
            value: p.identifier_value,
        }],
        name: [{
            use: 'official',
            family,
            ...(famExt.length > 0 && { _family: { extension: famExt } }),
            given: [p.given_name, p.middle_name].filter(Boolean),
        }],
        active: true,
        gender: mapGender(p.gender),
        ...(p.biological_gender_code && {
            _gender: {
                extension: [{
                    url: EXT.BIOLOGICAL_GENDER,
                    valueCoding: coding(CS.COL_GENDER_GROUP, p.biological_gender_code, p.biological_gender_display),
                }],
            },
        }),
        birthDate: p.birth_date,
        ...(p.birth_time && { _birthDate: { extension: [{ url: EXT.BIRTH_TIME, valueTime: p.birth_time }] } }),
        deceasedBoolean: p.deceased ?? false,
    };

    if (p.address_city || p.divipola_code) {
        resource.address = [{
            id: 'HomeAddress-0',
            use: 'home',
            type: 'physical',
            ...(p.residence_zone_code && {
                extension: [{
                    url: EXT.RESIDENCE_ZONE,
                    valueCoding: coding(CS.COL_RESIDENCE_ZONE, p.residence_zone_code, p.residence_zone_display),
                }],
            }),
            city: p.address_city ?? '',
            ...(p.divipola_code && {
                _city: { extension: [{ url: EXT.DIVIPOLA_MUNICIPALITY, valueCoding: { system: CS.DIVIPOLA, code: p.divipola_code } }] },
            }),
            country: 'Colombia',
            _country: { extension: [{ url: EXT.COUNTRY_CODE, valueCoding: { system: CS.ISO_3166_1, code: '170' } }] },
        }];
    }
    return resource;
}

export function buildOrganization(t: TenantInput): Record<string, unknown> {
    return {
        resourceType: 'Organization',
        id: t.institution_code,
        meta: { profile: [PROFILES.ORGANIZATION] },
        identifier: [
            ...(t.nit ? [{
                id: 'TaxIdentifier-0',
                use: 'official',
                type: {
                    coding: [
                        { system: CS.V2_0203, code: 'TAX', display: 'Tax ID number' },
                        { system: CS.COL_ORG_ID, code: 'NIT', display: 'Número de Identificación Tributaria' },
                    ],
                },
                value: t.nit,
            }] : []),
            {
                id: 'HealthcareProviderIdentifier-0',
                use: 'official',
                type: {
                    coding: [
                        { system: CS.V2_0203, code: 'PRN', display: 'Provider number' },
                        { system: CS.COL_ORG_ID, code: 'CodigoPrestador', display: 'Código de habilitación de prestador de servicios de salud' },
                    ],
                },
                system: NS.REPS,
                value: t.institution_code,
            },
        ],
        ...(t.name && { name: t.name }),
    };
}

export function buildPractitioner(pr: PractitionerInput): Record<string, unknown> {
    const { given, father, mother } = decomposeName(pr.doctor_name);
    const idType = (pr.doctor_identifier_type ?? 'CC').toUpperCase();
    return {
        resourceType: 'Practitioner',
        id: practitionerId(pr),
        meta: { profile: [PROFILES.PRACTITIONER] },
        identifier: [{
            id: 'NationalPersonIdentifier-0',
            use: 'official',
            type: {
                coding: [
                    { system: CS.V2_0203, code: 'PN', display: 'Person number' },
                    coding(CS.COL_PERSON_ID, idType),
                ],
            },
            value: pr.doctor_license,
        }],
        name: [{
            use: 'official',
            family: [father, mother].filter(Boolean).join(' '),
            _family: {
                extension: [
                    { url: EXT.FATHERS_FAMILY_NAME, valueString: father },
                    ...(mother ? [{ url: EXT.MOTHERS_FAMILY_NAME, valueString: mother }] : []),
                ],
            },
            given,
        }],
    };
}

export function buildLocation(t: TenantInput): Record<string, unknown> {
    const id = locationId(t);
    return {
        resourceType: 'Location',
        id,
        meta: { profile: [PROFILES.LOCATION] },
        identifier: [{ use: 'official', system: NS.REPS, value: id }],
        name: t.location_name ?? t.name ?? t.institution_code,
        managingOrganization: { reference: frag(t.institution_code) },
    };
}

export function buildPayer(p: PayerInput): Record<string, unknown> | null {
    if (p.private || !p.eapb_code) return null;
    return clean({
        resourceType: 'Organization',
        id: p.eapb_code,
        meta: { profile: [PROFILES.EAPB] },
        identifier: [{
            use: 'official',
            type: { coding: [{ system: CS.COL_ORG_ID, code: 'CodigoEAPB', display: 'Código EAPB' }] },
            value: p.eapb_code,
        }],
        name: p.name,
    });
}

export function buildCondition(c: ConditionInput, pRef: string): Record<string, unknown> {
    const clinical = c.clinical_status ?? 'active';
    const verification = c.verification_status ?? 'confirmed';
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return {
        resourceType: 'Condition',
        id: `Condition-${c.id}`,
        meta: { profile: [PROFILES.CONDITION] },
        clinicalStatus: { coding: [{ system: CS.CONDITION_CLINICAL, code: clinical, display: cap(clinical) }] },
        verificationStatus: { coding: [{ system: CS.CONDITION_VERIFICATION, code: verification, display: cap(verification) }] },
        category: [{
            coding: [{
                system: CS.CONDITION_CATEGORY,
                code: c.condition_category ?? 'encounter-diagnosis',
                display: (c.condition_category ?? 'encounter-diagnosis') === 'problem-list-item' ? 'Problem List Item' : 'Encounter Diagnosis',
            }],
        }],
        code: c.condition_code
            ? { coding: [{ system: CS.ICD10, code: c.condition_code, display: c.condition_display }], text: c.condition_display }
            : { text: c.condition_display },
        subject: { reference: pRef },
    };
}

export function buildAllergy(a: AllergyInput, pRef: string, encRef?: string): Record<string, unknown> {
    const status = (a.status ?? 'active').toLowerCase();
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return clean({
        resourceType: 'AllergyIntolerance',
        id: `AllergyIntolerance-${a.id}`,
        meta: { profile: [PROFILES.ALLERGY] },
        clinicalStatus: { coding: [{ system: CS.ALLERGY_CLINICAL, code: status, display: cap(status) }] },
        code: { coding: [coding(CS.COL_ALLERGY_TYPE, a.allergen_type_code ?? '01', a.allergen_type_display ?? (a.allergen_type_code ? undefined : 'Medicamento'))], text: a.allergen },
        patient: { reference: pRef },
        encounter: encRef ? { reference: encRef } : undefined,
    });
}

export function buildRiskAssessment(r: RiskFactorInput, pRef: string, encRef: string): Record<string, unknown> {
    return {
        resourceType: 'RiskAssessment',
        id: `RiskAssessment-${r.id}`,
        meta: { profile: [PROFILES.RISK_ASSESSMENT] },
        status: 'registered',
        code: { coding: [{ system: CS.FACTOR_RIESGO, code: r.risk_code, display: r.risk_display }], ...(r.risk_text && { text: r.risk_text }) },
        subject: { reference: pRef },
        encounter: { reference: encRef },
    };
}

function medicationCC(code: string | undefined, disp: string, sys?: 'MipresINN' | 'IUMPrimerNivel'): Record<string, unknown> {
    const system = sys === 'IUMPrimerNivel' ? CS.IUM_PRIMER_NIVEL : CS.MIPRES_INN;
    if (!code) return { text: disp };
    return { coding: [{ system, code, display: disp }], text: disp };
}

function dosageOf(m: MedicationRequestInput): Record<string, unknown> | undefined {
    const d = clean({
        text: m.dosage_text,
        patientInstruction: m.patient_instruction,
        additionalInstruction: m.special_instruction_code
            ? [cc(CS.MIPRES_INSTRUCTION, m.special_instruction_code, m.special_instruction_display)]
            : undefined,
        timing: (m.duration_days !== undefined || m.frequency_code) ? clean({
            repeat: m.duration_days !== undefined ? { duration: m.duration_days, durationUnit: 'd' } : undefined,
            code: m.frequency_code ? cc(CS.MEDICATION_TIME, m.frequency_code, m.frequency_display) : undefined,
        }) : undefined,
        route: m.route_code ? cc(CS.VAD, m.route_code, m.route_display) : undefined,
        doseAndRate: m.dose_value !== undefined ? [{
            doseQuantity: clean({
                value: m.dose_value,
                unit: m.dose_unit,
                system: m.dose_unit_code ? CS.UMM : undefined,
                code: m.dose_unit_code,
            }),
        }] : undefined,
    });
    return Object.keys(d).length > 0 ? d : undefined;
}

export function buildMedicationRequest(
    m: MedicationRequestInput,
    opts: { id: string; profile: string; pRef: string; encRef: string; prRef: string; intent?: string },
): Record<string, unknown> {
    return clean({
        resourceType: 'MedicationRequest',
        id: opts.id,
        meta: { profile: [opts.profile] },
        status: 'active',
        intent: opts.intent ?? 'order',
        category: [cc(CS.COL_HEALTH_TECH_CAT, m.category_code ?? '02', m.category_display ?? (m.category_code ? undefined : 'Medicamento con registro sanitario'))],
        medicationCodeableConcept: medicationCC(m.medication_code, m.medication_display, m.medication_system),
        subject: { reference: opts.pRef },
        encounter: { reference: opts.encRef },
        authoredOn: m.authored_on ?? nowISO(),
        requester: { reference: opts.prRef },
        reasonCode: m.reason_code ? [cc(CS.RIPS_FINALIDAD, m.reason_code, m.reason_display)] : undefined,
        reasonReference: m.reason_condition_id ? [{ reference: frag(`Condition-${m.reason_condition_id}`) }] : undefined,
        groupIdentifier: m.prescription_number ? { system: NS.PRESCRIPTION, value: m.prescription_number } : undefined,
        dosageInstruction: (() => { const d = dosageOf(m); return d ? [d] : undefined; })(),
        dispenseRequest: (m.dispense_quantity_value !== undefined || m.number_of_repeats !== undefined) ? clean({
            numberOfRepeatsAllowed: m.number_of_repeats,
            quantity: m.dispense_quantity_value !== undefined ? clean({
                value: m.dispense_quantity_value,
                unit: m.dispense_quantity_unit,
                system: m.dispense_unit_code ? CS.MIPRES_DISPENSE_UNIT : undefined,
                code: m.dispense_unit_code,
            }) : undefined,
        }) : undefined,
    });
}

export function buildMedicationAdministration(
    m: MedicationAdministrationInput,
    opts: { pRef: string; encRef: string; prRef: string },
): Record<string, unknown> {
    return clean({
        resourceType: 'MedicationAdministration',
        id: `MedicationAdministration-${m.id}`,
        meta: { profile: [PROFILES.MEDICATION_ADMINISTRATION] },
        status: 'completed',
        medicationCodeableConcept: medicationCC(m.medication_code, m.medication_display, m.medication_system),
        subject: { reference: opts.pRef },
        context: { reference: opts.encRef },
        effectivePeriod: { start: m.effective_start, end: m.effective_end ?? m.effective_start },
        performer: [{ actor: { reference: opts.prRef } }],
        request: m.request_id ? { reference: frag(`MedicationRequest-adm-${m.request_id}`) } : undefined,
        note: m.note ? [{ text: m.note }] : undefined,
        dosage: (m.route_code || m.dose_value !== undefined) ? clean({
            route: m.route_code ? cc(CS.VAD, m.route_code, m.route_display) : undefined,
            dose: m.dose_value !== undefined ? clean({
                value: m.dose_value, unit: m.dose_unit,
                system: m.dose_unit_code ? CS.UMM : undefined, code: m.dose_unit_code,
            }) : undefined,
        }) : undefined,
    });
}

export function buildProcedure(
    p: ProcedureInput,
    opts: { pRef: string; encRef: string; prRef: string },
): Record<string, unknown> {
    const reasonRefs: object[] = [];
    if (p.main_condition_id) reasonRefs.push({ id: 'MainDiagnosis', reference: frag(`Condition-${p.main_condition_id}`) });
    if (p.related_condition_id) reasonRefs.push({ id: 'Comobility-1', reference: frag(`Condition-${p.related_condition_id}`) });
    return clean({
        resourceType: 'Procedure',
        id: `Procedure-${p.id}`,
        meta: { profile: [PROFILES.PROCEDURE] },
        extension: p.surgical_method_code
            ? [{ url: EXT.SURGICAL_METHOD, valueCoding: coding(CS.COL_SURGICAL_METHOD, p.surgical_method_code, p.surgical_method_display) }]
            : undefined,
        status: 'completed',
        category: { coding: [{ system: CS.COL_HEALTH_TECH_CAT, code: '01', display: 'Procedimiento en salud' }] },
        code: { coding: [{ system: CS.CUPS, code: p.cups_code, display: p.cups_display }] },
        subject: { reference: opts.pRef },
        encounter: { reference: opts.encRef },
        performedDateTime: p.performed_datetime,
        performer: [{ actor: { reference: opts.prRef } }],
        reasonCode: p.reason_code ? [cc(CS.RIPS_FINALIDAD, p.reason_code, p.reason_display)] : undefined,
        reasonReference: reasonRefs,
        complication: p.complication_code
            ? [{ coding: [{ system: CS.ICD10, code: p.complication_code, display: p.complication_display ?? p.complication_code }] }]
            : undefined,
    });
}

export function buildProcedureResult(
    r: ProcedureResultInput,
    opts: { pRef: string; encRef: string; prRef: string },
): Record<string, unknown> {
    return clean({
        resourceType: 'Observation',
        id: `Observation-result-${r.id}`,
        meta: { profile: [PROFILES.PROCEDURE_RESULT] },
        partOf: [{ reference: frag(`Procedure-${r.procedure_id}`) }],
        status: 'final',
        code: { coding: [{ system: CS.CUPS, code: r.cups_code, display: r.cups_display }] },
        subject: { reference: opts.pRef },
        encounter: { reference: opts.encRef },
        effectiveDateTime: r.effective_datetime,
        performer: [{ reference: opts.prRef }],
        component: (r.components ?? []).map(c => clean({
            code: { text: c.name },
            valueQuantity: c.value_quantity !== undefined ? clean({
                value: c.value_quantity, unit: c.unit,
                system: c.unit_code ? CS.UCUM : undefined, code: c.unit_code,
            }) : undefined,
            valueString: c.value_quantity === undefined ? (c.value_string ?? '') : undefined,
        })),
    });
}

export function buildServiceRequest(
    s: ServiceRequestInput,
    opts: { pRef: string; encRef: string; prRef: string },
): Record<string, unknown> {
    const hasCups = !!s.cups_code;
    return clean({
        resourceType: 'ServiceRequest',
        id: `ServiceRequest-${s.id}`,
        meta: { profile: [hasCups ? PROFILES.SERVICE_REQUEST_PROC : PROFILES.SERVICE_REQUEST_OTHER] },
        status: 'active',
        intent: 'order',
        category: [cc(CS.COL_HEALTH_TECH_CAT, s.category_code ?? '01', s.category_display ?? (s.category_code ? undefined : 'Procedimiento en salud'))],
        code: hasCups
            ? { coding: [{ system: CS.CUPS, code: s.cups_code, display: s.cups_display ?? s.cups_code }] }
            : { text: s.description ?? 'Sin descripción' },
        subject: { reference: opts.pRef },
        encounter: { reference: opts.encRef },
        authoredOn: s.authored_on ?? nowISO(),
        requester: { reference: opts.prRef },
        reasonCode: s.reason_code ? [cc(CS.RIPS_FINALIDAD, s.reason_code, s.reason_display)] : undefined,
    });
}

export function buildIncapacidad(inc: IncapacidadInput, pRef: string, encRef: string): Record<string, unknown> {
    const comps: object[] = [];
    if (inc.scope_code) {
        comps.push({
            id: 'LicenseScope',
            code: { coding: [{ system: CS.SNOMED, code: '255590007', display: 'alcance' }], text: 'Incapacidad - Alcance de la incapacidad' },
            valueCodeableConcept: cc(CS.COL_LICENSE_SCOPE, inc.scope_code, inc.scope_display),
        });
    }
    if (inc.days !== undefined) {
        comps.push({
            id: 'LicenseTime',
            code: { coding: [{ system: CS.SNOMED, code: '410670007', display: 'tiempo' }], text: 'Días de incapacidad' },
            valueQuantity: { value: inc.days, unit: 'días', system: CS.UCUM, code: 'd' },
        });
    }
    return clean({
        resourceType: 'Observation',
        id: 'Observation-incapacidad',
        meta: { profile: [PROFILES.OBSERVATION_INCAP] },
        status: 'final',
        code: {
            coding: [{ system: CS.SNOMED, code: '160983005', display: 'permiso de concurrencia' }],
            text: 'Datos incapacidad (SIPE – Sistema de Incapacidades y Prestaciones Economicas)',
        },
        subject: { reference: pRef },
        encounter: { reference: encRef },
        component: comps,
    });
}

export function buildOcupacion(o: OcupacionInput, pRef: string, encRef: string): Record<string, unknown> {
    return {
        resourceType: 'Observation',
        id: 'Observation-ocupacion',
        meta: { profile: [PROFILES.OBSERVATION_OCUP] },
        status: 'final',
        code: {
            coding: [{ system: CS.SNOMED, code: '184104002', display: 'ocupación del paciente' }],
            text: 'Ocupación del paciente en el momento de la atención',
        },
        subject: { reference: pRef },
        encounter: { reference: encRef },
        valueCodeableConcept: { coding: [{ system: CS.COL_OCCUPATION, code: o.occupation_code, display: o.occupation_display }] },
    };
}

export function buildDocumentReference(d: DocumentReferenceInput, pRef: string, orgRef: string): Record<string, unknown> {
    const typeCoding: object[] = [];
    if (d.loinc_code) typeCoding.push({ system: CS.LOINC, code: d.loinc_code, display: d.loinc_display ?? d.loinc_code });
    if (d.doc_type_code) typeCoding.push({ system: CS.COL_DOC_TYPES, code: d.doc_type_code, display: d.doc_type_display ?? d.doc_type_code });
    return clean({
        resourceType: 'DocumentReference',
        id: `DocumentReference-${d.id}`,
        meta: { profile: [PROFILES.DOCUMENT_REFERENCE] },
        status: 'current',
        type: { coding: typeCoding.length > 0 ? typeCoding : [{ system: CS.LOINC, code: '18842-5', display: 'Discharge summary' }] },
        category: [{ coding: [{ system: CS.LOINC, code: '55108-5', display: 'Clinical presentation Document' }] }],
        subject: { reference: pRef },
        date: d.date ?? nowISO(),
        author: [{ reference: orgRef }],
        custodian: { reference: orgRef },
        description: d.description ?? 'Documento de soporte RDA',
        securityLabel: [{ coding: [{ system: CS.CONFIDENTIALITY, code: 'N', display: 'Normal' }] }],
        content: d.pdf_base64 ? [{ attachment: { contentType: 'application/pdf', data: d.pdf_base64 } }] : undefined,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Secciones de Composition
// ─────────────────────────────────────────────────────────────────────────────

export function emptySection(title: string, loinc: string, loincDisplay: string): Record<string, unknown> {
    return {
        title,
        code: { coding: [{ system: CS.LOINC, code: loinc, display: loincDisplay }] },
        text: {
            status: 'generated',
            div: "<div xmlns='http://www.w3.org/1999/xhtml'>No existen elementos conocidos para esta sección</div>",
        },
        emptyReason: { coding: [{ system: CS.LIST_EMPTY_REASON, code: 'nilknown', display: 'Nil Known' }] },
    };
}

export function section(title: string, loinc: string, loincDisplay: string, refs: string[]): Record<string, unknown> {
    if (refs.length === 0) return emptySection(title, loinc, loincDisplay);
    return {
        title,
        code: { coding: [{ system: CS.LOINC, code: loinc, display: loincDisplay }] },
        entry: refs.map(reference => ({ reference })),
    };
}

/** Recolecta las referencias '#id' de un bundle y devuelve las que no resuelven a un recurso del bundle. */
export function findDanglingReferences(bundle: { entry?: Array<{ resource?: Record<string, unknown> }> }): string[] {
    const ids = new Set<string>();
    for (const e of bundle.entry ?? []) {
        const id = e.resource?.id;
        if (typeof id === 'string') ids.add(id);
    }
    const dangling = new Set<string>();
    const walk = (node: unknown): void => {
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (node && typeof node === 'object') {
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (k === 'reference' && typeof v === 'string' && v.startsWith('#') && !ids.has(v.slice(1))) {
                    dangling.add(v);
                } else {
                    walk(v);
                }
            }
        }
    };
    walk(bundle);
    return Array.from(dangling);
}
