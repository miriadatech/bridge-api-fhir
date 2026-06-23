// src/translators/RDAAmbulatoryTranslator.ts
// RDA de Consulta Externa — alineación exacta con JSON oficial MinSalud

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE ENTRADA ("JSON normal" que debe recibir el endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export interface RDAAmbulatoryPatient {
    /** Tipo de documento: CC | TI | CE | PA | RC | MS | AS | NU | CN | PE | PT | CD | SC | DE */
    identifier_type: string;
    /** Número del documento */
    identifier_value: string;
    given_name: string;
    middle_name?: string;
    family_name: string;
    father_family_name?: string;
    mother_family_name?: string;
    /** male | female | other | unknown */
    gender: string;
    birth_date: string;                  // YYYY-MM-DD
    birth_time?: string;                 // HH:mm:ss
    address_city?: string;
    divipola_code?: string;              // ej. "11001"
    residence_zone_code?: string;        // "01" Urbana | "02" Rural
    residence_zone_display?: string;
    nationality_code?: string;           // ISO 3166-1 numeric, ej. "170"
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

export interface RDAAmbulatoryTenant {
    /** UUID interno del tenant */
    id: string;
    name?: string;
    /** NIT de la IPS */
    nit?: string;
    /** Código de habilitación REPS */
    institution_code: string;
    /** Nombre del establecimiento para Location */
    location_name?: string;
}

export interface RDAAmbulatoryPractitioner {
    /** Nombre completo del médico (se descompone automáticamente) */
    doctor_name: string;
    /** CC del médico */
    doctor_license: string;
}

export interface RDAAmbulatoryEncounter {
    /** Identificador del encuentro en el HIS (ej. "ADT-HS-9864463-12") */
    encounter_id: string;
    /** Fecha/hora inicio de la atención — ISO-8601 con offset */
    period_start: string;
    /** Fecha/hora fin de la atención — ISO-8601 con offset */
    period_end?: string;
    /** Código modalidad tecnológica (ColombianTechModality): "01" Intramural, "02" Extramural, etc. */
    tech_modality_code?: string;
    tech_modality_display?: string;
    /** Código grupo de servicios (GrupoServicios): "01" Consulta externa */
    service_group_code?: string;
    service_group_display?: string;
    /** Código servicio REPS (REPShealthcareServices): ej. "328" MEDICINA GENERAL */
    reps_service_code?: string;
    reps_service_display?: string;
    /** Entorno de atención (EntornoAtencion): ej. "05" Institucional */
    care_setting_code?: string;
    care_setting_display?: string;
    /** CUPS del tipo de servicio prestado (ej. "890201" CONSULTA DE PRIMERA VEZ) */
    cups_service_code?: string;
    cups_service_display?: string;
    /** Causa externa (RIPSCausaExternaVersion2): ej. "22" ACCIDENTE EN EL HOGAR */
    external_cause_code?: string;
    external_cause_display?: string;
    /** Condición y destino al egreso (CondicionyDestinoUsuarioEgreso): ej. "04" REFERIDO A OTRA INSTITUCIÓN */
    discharge_disposition_code?: string;
    discharge_disposition_display?: string;
}

export interface RDAAmbulatoryCondition {
    /** Índice / identificador interno (0, 1, 2 …) */
    id: string;
    /** Código ICD-10 */
    condition_code?: string;
    condition_display: string;
    /** active | inactive | resolved */
    clinical_status?: string;
    /** confirmed | unconfirmed */
    verification_status?: string;
    /** encounter-diagnosis | problem-list-item */
    condition_category?: string;
    /** Tipo de diagnóstico principal (RIPSTipoDiagnosticoPrincipalVersion2): "02" Confirmado Nuevo */
    diagnosis_type_code?: string;
    diagnosis_type_display?: string;
    /** Rol del diagnóstico (ColombianDiagnosisRole): ej. "8319008" diagnóstico primario */
    diagnosis_role_code?: string;
    diagnosis_role_display?: string;
    /** Rank del diagnóstico en el encuentro */
    rank?: number;
}

export interface RDAAmbulatoryAllergy {
    id: string;
    allergen: string;
    /** Código TipoAlergia: "01" Medicamento | "02" Alimento | etc. */
    allergen_type_code?: string;
    allergen_type_display?: string;
    /** active | inactive */
    status?: string;
}

export interface RDAAmbulatoryRiskFactor {
    id: string;
    /** Código FactorRiesgo: ej. "01" Químicos */
    risk_code: string;
    risk_display: string;
    /** Texto libre del factor de riesgo */
    risk_text?: string;
}

export interface RDAAmbulatoryMedicationRequest {
    id: string;
    /** Código IUM primer nivel */
    medication_code?: string;
    medication_display: string;
    /** Código categoría ColombianHealthTechnologyCategory: "02" Medicamento con registro sanitario */
    category_code?: string;
    category_display?: string;
    /** Fecha de la prescripción ISO-8601 */
    authored_on?: string;
    /** Código finalidad (RIPSFinalidadConsultaVersion2): ej. "15" DIAGNOSTICO */
    reason_code?: string;
    reason_display?: string;
    /** Referencia al Condition (id interno) si aplica */
    reason_condition_id?: string;
    /** Número de prescripción MIPRES */
    prescription_number?: string;
    dosage_text?: string;
    patient_instruction?: string;
    /** Código instrucción especial MIPRES: ej. "10" Sin indicación Especial */
    special_instruction_code?: string;
    special_instruction_display?: string;
    /** Duración en días */
    duration_days?: number;
    /** Código frecuencia (MedicationTime): ej. "3" Día */
    frequency_code?: string;
    frequency_display?: string;
    /** Código vía de administración (VAD): ej. "048" ORAL */
    route_code?: string;
    route_display?: string;
    /** Valor dosis */
    dose_value?: number;
    dose_unit?: string;
    /** Código unidad de medida (UMM) */
    dose_unit_code?: string;
    /** Cantidad a dispensar */
    dispense_quantity_value?: number;
    dispense_quantity_unit?: string;
    /** Código unidad de dispensación (MipresDispenseUnit) */
    dispense_unit_code?: string;
    /** Número de repeticiones permitidas */
    number_of_repeats?: number;
}

export interface RDAAmbulatoryServiceRequest {
    id: string;
    /** Código categoría ColombianHealthTechnologyCategory: "01" Procedimiento | "06" Dispositivo médico | etc. */
    category_code?: string;
    category_display?: string;
    /** Código CUPS si es procedimiento en salud */
    cups_code?: string;
    cups_display?: string;
    /** Texto libre si NO tiene código CUPS (ej. dispositivo médico) */
    description?: string;
    /** Fecha ISO-8601 */
    authored_on?: string;
    /** Código finalidad (RIPSFinalidadConsultaVersion2) */
    reason_code?: string;
    reason_display?: string;
}

export interface RDAAmbulatoryIncapacidad {
    /** Código alcance (ColombianLicenseScope): "01" Nueva | "02" Prórroga | etc. */
    scope_code?: string;
    scope_display?: string;
    /** Días de incapacidad/licencia */
    days?: number;
}

export interface RDAAmbulatoryOcupacion {
    /** Código CIUO-88 A.C.: ej. "3121" Analistas de sistemas informáticos */
    occupation_code: string;
    occupation_display: string;
}

export interface RDAAmbulatoryPaymentSource {
    /** ID interno del recurso (ej. "CCFC33") */
    id: string;
    name: string;
}

export interface RDAAmbulatoryDocumentReference {
    id: string;
    /** Código tipo de documento LOINC: ej. "18842-5" Discharge summary */
    loinc_code?: string;
    loinc_display?: string;
    /** Código tipo colombiano (ColombianDocumentTypes): ej. "EPI" Epicrisis */
    doc_type_code?: string;
    doc_type_display?: string;
    /** Fecha del documento ISO-8601 */
    date?: string;
    description?: string;
}

/** Estructura principal que debe recibir el endpoint POST /api/ehr/rda/ambulatory/translate */
export interface RDAAmbulatoryInput {
    patient: RDAAmbulatoryPatient;
    tenant: RDAAmbulatoryTenant;
    practitioner: RDAAmbulatoryPractitioner;
    encounter: RDAAmbulatoryEncounter;
    /** Fecha/hora del documento Composition (ISO-8601) */
    composition_date?: string;
    /** Período del evento clínico */
    event_start?: string;
    event_end?: string;
    /** Entidad responsable del plan de beneficios */
    payment_source?: RDAAmbulatoryPaymentSource;
    conditions?: RDAAmbulatoryCondition[];
    allergies?: RDAAmbulatoryAllergy[];
    risk_factors?: RDAAmbulatoryRiskFactor[];
    medication_requests?: RDAAmbulatoryMedicationRequest[];
    /** Órdenes/solicitudes de servicio */
    service_requests?: RDAAmbulatoryServiceRequest[];
    incapacidad?: RDAAmbulatoryIncapacidad;
    ocupacion?: RDAAmbulatoryOcupacion;
    document_references?: RDAAmbulatoryDocumentReference[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES OFICIALES
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://fhir.minsalud.gov.co/rda';

const PROFILES = {
    COMPOSITION:          `${BASE}/StructureDefinition/CompositionAmbulatoryRDA`,
    PATIENT:              `${BASE}/StructureDefinition/PatientRDA`,
    ORGANIZATION:         `${BASE}/StructureDefinition/CareDeliveryOrganizationRDA`,
    PRACTITIONER:         `${BASE}/StructureDefinition/PractitionerRDA`,
    ENCOUNTER:            `${BASE}/StructureDefinition/EncounterAmbulatoryRDA`,
    LOCATION:             `${BASE}/StructureDefinition/CareDeliveryLocationRDA`,
    CONDITION:            `${BASE}/StructureDefinition/ConditionRDA`,
    ALLERGY:              `${BASE}/StructureDefinition/AllergyIntoleranceRDA`,
    RISK_ASSESSMENT:      `${BASE}/StructureDefinition/RiskFactorRDA`,
    MEDICATION_REQUEST:   `${BASE}/StructureDefinition/MedicationRequestRDA`,
    SERVICE_REQUEST_PROC: `${BASE}/StructureDefinition/ServiceRequestRDA`,
    SERVICE_REQUEST_OTHER:`${BASE}/StructureDefinition/OtherTechnologyServiceRequestRDA`,
    OBSERVATION_INCAP:    `${BASE}/StructureDefinition/AttendanceAllowanceRDA`,
    OBSERVATION_OCUP:     `${BASE}/StructureDefinition/PatientOccupationAtEncounterRDA`,
    DOCUMENT_REFERENCE:   `${BASE}/StructureDefinition/DocumentReferenceEPIRDA`,
};

const EXT = {
    NATIONALITY:           `${BASE}/StructureDefinition/ExtensionPatientNationality`,
    ETHNICITY:             `${BASE}/StructureDefinition/ExtensionPatientEthnicity`,
    DISABILITY:            `${BASE}/StructureDefinition/ExtensionPatientDisability`,
    GENDER_IDENTITY:       `${BASE}/StructureDefinition/ExtensionPatientGenderIdentity`,
    BIOLOGICAL_GENDER:     `${BASE}/StructureDefinition/ExtensionBiologicalGender`,
    RESIDENCE_ZONE:        `${BASE}/StructureDefinition/ExtensionResidenceZone`,
    DIVIPOLA_MUNICIPALITY: `${BASE}/StructureDefinition/ExtensionDivipolaMunicipality`,
    COUNTRY_CODE:          `${BASE}/StructureDefinition/ExtensionCountryCode`,
    FATHERS_FAMILY_NAME:   `${BASE}/StructureDefinition/ExtensionFathersFamilyName`,
    MOTHERS_FAMILY_NAME:   `${BASE}/StructureDefinition/ExtensionMothersFamilyName`,
    BIRTH_TIME:            `${BASE}/StructureDefinition/ExtensionBirthTime`,
    DISCHARGE_DISPOSITION: `${BASE}/StructureDefinition/ExtensionDischargeDisposition`,
    DIAGNOSIS_TYPE:        `${BASE}/StructureDefinition/ExtensionDiagnosisType`,
    DISPENSE_QUANTITY:     `${BASE}/StructureDefinition/ExtensionMedicationDispenseQuantity`,
};

const CS = {
    LOINC:                `http://loinc.org`,
    ICD10:                `http://hl7.org/fhir/sid/icd-10`,
    SNOMED:               `http://snomed.info/sct`,
    UCUM:                 `http://unitsofmeasure.org`,
    V2_0203:              `http://terminology.hl7.org/CodeSystem/v2-0203`,
    V3_ACT_CODE:          `http://terminology.hl7.org/CodeSystem/v3-ActCode`,
    V3_PARTICIPATION:     `http://terminology.hl7.org/CodeSystem/v3-ParticipationType`,
    CONDITION_CLINICAL:   `http://terminology.hl7.org/CodeSystem/condition-clinical`,
    CONDITION_CATEGORY:   `http://terminology.hl7.org/CodeSystem/condition-category`,
    CONFIDENTIALITY:      `http://terminology.hl7.org/CodeSystem/v3-Confidentiality`,
    LIST_EMPTY_REASON:    `http://terminology.hl7.org/CodeSystem/list-empty-reason`,
    COL_PERSON_ID:        `${BASE}/CodeSystem/ColombianPersonIdentifier`,
    COL_ORG_ID:           `${BASE}/CodeSystem/ColombianOrganizationIdentifiers`,
    COL_ETHNICITY:        `${BASE}/CodeSystem/ColombianEthnicGroup`,
    COL_DISABILITY:       `${BASE}/CodeSystem/ColombianDisabilityClassification`,
    COL_GENDER_IDENTITY:  `${BASE}/CodeSystem/ColombianGenderIdentity`,
    COL_GENDER_GROUP:     `${BASE}/CodeSystem/ColombianGenderGroup`,
    COL_RESIDENCE_ZONE:   `${BASE}/CodeSystem/ColombianResidenceZone`,
    COL_TECH_MODALITY:    `${BASE}/CodeSystem/ColombianTechModality`,
    COL_SERVICE_GROUP:    `${BASE}/CodeSystem/GrupoServicios`,
    COL_ALLERGY_TYPE:     `${BASE}/CodeSystem/TipoAlergia`,
    COL_DIAGNOSIS_ROLE:   `${BASE}/CodeSystem/ColombianDiagnosisRole`,
    COL_DIAGNOSIS_TYPE:   `${BASE}/CodeSystem/RIPSTipoDiagnosticoPrincipalVersion2`,
    COL_DISCHARGE_DISP:   `${BASE}/CodeSystem/CondicionyDestinoUsuarioEgreso`,
    COL_HEALTH_TECH_CAT:  `${BASE}/CodeSystem/ColombianHealthTechnologyCategory`,
    COL_DOC_TYPES:        `${BASE}/CodeSystem/ColombianDocumentTypes`,
    COL_LICENSE_SCOPE:    `${BASE}/CodeSystem/ColombianLicenseScope`,
    COL_OCCUPATION:       `${BASE}/CodeSystem/CIUO88AC`,
    REPS_SERVICES:        `${BASE}/CodeSystem/REPShealthcareServices`,
    CUPS:                 `${BASE}/CodeSystem/CUPS`,
    RIPS_CAUSE_EXT:       `${BASE}/CodeSystem/RIPSCausaExternaVersion2`,
    RIPS_FINALIDAD:       `${BASE}/CodeSystem/RIPSFinalidadConsultaVersion2`,
    ENTORNO_ATENCION:     `${BASE}/CodeSystem/EntornoAtencion`,
    FACTOR_RIESGO:        `${BASE}/CodeSystem/FactorRiesgo`,
    IUM_PRIMER_NIVEL:     `${BASE}/CodeSystem/IUMPrimerNivel`,
    MIPRES_INSTRUCTION:   `${BASE}/CodeSystem/MipresSpecialInstruction`,
    MEDICATION_TIME:      `${BASE}/CodeSystem/MedicationTime`,
    VAD:                  `${BASE}/CodeSystem/VAD`,
    UMM:                  `${BASE}/CodeSystem/UMM`,
    MIPRES_DOSE_FORM:     `${BASE}/CodeSystem/MipresDoseForm`,
    MIPRES_DISPENSE_UNIT: `${BASE}/CodeSystem/MipresDispenseUnit`,
    ISO_3166_1:           `${BASE}/CodeSystem/ISO31661`,
    DIVIPOLA:             `${BASE}/CodeSystem/DIVIPOLA`,
};

const NS = {
    RNEC:      `${BASE}/NamingSystem/RNEC`,
    REPS:      `http://co.fhir.guide/NamingSystem/REPS`,
    ENCOUNTERS:`${BASE}/NamingSystem/Encounters`,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const nowISO = (): string => new Date().toISOString();

function toDateString(value: Date | string | undefined): string {
    if (!value) return nowISO();
    if (typeof value === 'string') return value;
    return value.toISOString();
}

function mapGender(g: string): string {
    const m: Record<string, string> = {
        male: 'male', M: 'male', masculino: 'male',
        female: 'female', F: 'female', femenino: 'female',
        other: 'other', unknown: 'unknown',
    };
    return m[g] ?? 'unknown';
}

const frag = (id: string) => `#${id}`;

function buildEmptySection(title: string, loincCode: string, loincDisplay: string): object {
    return {
        title,
        code: { coding: [{ system: CS.LOINC, code: loincCode, display: loincDisplay }] },
        emptyReason: {
            coding: [{ system: CS.LIST_EMPTY_REASON, code: 'nilknown', display: 'Nil Known' }],
        },
        text: {
            status: 'generated',
            div: "<div xmlns='http://www.w3.org/1999/xhtml'>No existen elementos conocidos para esta sección</div>",
        },
    };
}

function buildSection(title: string, loincCode: string, loincDisplay: string, refs: string[]): object {
    if (refs.length === 0) return buildEmptySection(title, loincCode, loincDisplay);
    return {
        title,
        code: { coding: [{ system: CS.LOINC, code: loincCode, display: loincDisplay }] },
        entry: refs.map(r => ({ reference: r })),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Descomposición de nombre del médico (misma lógica que RDAPatientStatementTranslator)
// ─────────────────────────────────────────────────────────────────────────────

const HONORIFICS = new Set([
    'dr.', 'dr', 'dra.', 'dra', 'lic.', 'lic', 'mg.', 'mg',
    'esp.', 'esp', 'prof.', 'prof', 'ing.', 'ing', 'mr.', 'mr',
    'mrs.', 'mrs', 'ms.', 'ms', 'phd.', 'phd',
]);

function decomposeName(fullName: string): { givenN: string[]; fatherFN: string; motherFN: string } {
    const rawParts = fullName.trim().split(/\s+/);
    const parts = rawParts.filter(t => !HONORIFICS.has(t.toLowerCase()));
    const safeParts = parts.length > 0 ? parts : rawParts;

    if (safeParts.length === 1) {
        return { givenN: [safeParts[0]], fatherFN: safeParts[0], motherFN: '' };
    } else if (safeParts.length === 2) {
        return { givenN: [safeParts[0]], fatherFN: safeParts[1], motherFN: '' };
    } else {
        return {
            fatherFN: safeParts[safeParts.length - 2],
            motherFN: safeParts[safeParts.length - 1],
            givenN: safeParts.slice(0, -2),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSOS FHIR
// ─────────────────────────────────────────────────────────────────────────────

function buildPatientResource(p: RDAAmbulatoryPatient): object {
    const idType = p.identifier_type ?? 'CC';
    const internalId = `${idType}-${p.identifier_value}`;
    const extensions: object[] = [];

    if (p.nationality_code) {
        extensions.push({
            url: EXT.NATIONALITY,
            valueCoding: {
                system: CS.ISO_3166_1,
                code: p.nationality_code,
                display: p.nationality_code === '170' ? 'Colombia' : p.nationality_code,
            },
        });
    }
    if (p.ethnicity_code) {
        extensions.push({
            url: EXT.ETHNICITY,
            valueCoding: {
                system: CS.COL_ETHNICITY,
                code: p.ethnicity_code,
                ...(p.ethnicity_display && { display: p.ethnicity_display }),
            },
        });
    }
    if (p.disability_code) {
        extensions.push({
            url: EXT.DISABILITY,
            valueCoding: {
                system: CS.COL_DISABILITY,
                code: p.disability_code,
                ...(p.disability_display && { display: p.disability_display }),
            },
        });
    }
    if (p.gender_identity_code) {
        extensions.push({
            url: EXT.GENDER_IDENTITY,
            valueCoding: {
                system: CS.COL_GENDER_IDENTITY,
                code: p.gender_identity_code,
                ...(p.gender_identity_display && { display: p.gender_identity_display }),
            },
        });
    }

    const familyName = [p.father_family_name, p.mother_family_name].filter(Boolean).join(' ') || p.family_name;
    const familyExts: object[] = [];
    if (p.father_family_name) familyExts.push({ url: EXT.FATHERS_FAMILY_NAME, valueString: p.father_family_name });
    if (p.mother_family_name) familyExts.push({ url: EXT.MOTHERS_FAMILY_NAME, valueString: p.mother_family_name });

    const resource: any = {
        resourceType: 'Patient',
        id: internalId,
        meta: { profile: [PROFILES.PATIENT] },
        ...(extensions.length > 0 && { extension: extensions }),
        identifier: [{
            type: {
                coding: [
                    { system: CS.V2_0203, code: 'PN', display: 'Person number' },
                    {
                        system: CS.COL_PERSON_ID,
                        code: idType,
                        display: idType === 'CC' ? 'Cédula ciudadanía' : idType,
                    },
                ],
            },
            id: 'NationalPersonIdentifier-0',
            use: 'official',
            system: NS.RNEC,
            value: p.identifier_value,
        }],
        name: [{
            given: [p.given_name, p.middle_name].filter(Boolean) as string[],
            use: 'official',
            family: familyName,
            ...(familyExts.length > 0 && { _family: { extension: familyExts } }),
        }],
        active: true,
        gender: mapGender(p.gender),
        ...(p.biological_gender_code && {
            _gender: {
                extension: [{
                    url: EXT.BIOLOGICAL_GENDER,
                    valueCoding: {
                        system: CS.COL_GENDER_GROUP,
                        code: p.biological_gender_code,
                        ...(p.biological_gender_display && { display: p.biological_gender_display }),
                    },
                }],
            },
        }),
        birthDate: p.birth_date,
        ...(p.birth_time && {
            _birthDate: { extension: [{ url: EXT.BIRTH_TIME, valueTime: p.birth_time }] },
        }),
        deceasedBoolean: p.deceased ?? false,
    };

    if (p.address_city || p.divipola_code) {
        const addrExts: object[] = [];
        if (p.residence_zone_code) {
            addrExts.push({
                url: EXT.RESIDENCE_ZONE,
                valueCoding: {
                    system: CS.COL_RESIDENCE_ZONE,
                    code: p.residence_zone_code,
                    ...(p.residence_zone_display && { display: p.residence_zone_display }),
                },
            });
        }
        resource.address = [{
            id: 'HomeAddress-0',
            use: 'home',
            type: 'physical',
            city: p.address_city ?? '',
            ...(p.divipola_code && {
                _city: {
                    extension: [{
                        url: EXT.DIVIPOLA_MUNICIPALITY,
                        valueCoding: { code: p.divipola_code, system: CS.DIVIPOLA },
                    }],
                },
            }),
            country: 'Colombia',
            _country: {
                extension: [{
                    url: EXT.COUNTRY_CODE,
                    valueCoding: { system: CS.ISO_3166_1, code: p.nationality_code ?? '170' },
                }],
            },
            ...(addrExts.length > 0 && { extension: addrExts }),
        }];
    }

    return resource;
}

// ─────────────────────────────────────────────────────────────────────────────

function buildOrganizationResource(tenant: RDAAmbulatoryTenant): object {
    return {
        resourceType: 'Organization',
        id: tenant.institution_code,
        meta: { profile: [PROFILES.ORGANIZATION] },
        identifier: [
            {
                id: 'TaxIdentifier-0',
                use: 'official',
                type: {
                    coding: [
                        { system: CS.V2_0203, code: 'TAX', display: 'Tax ID number' },
                        { system: CS.COL_ORG_ID, code: 'NIT', display: 'Número de Identificación Tributaria' },
                    ],
                },
                value: tenant.nit ?? 'Desconocido',
            },
            {
                id: 'HealthcareProviderIdentifier-0',
                use: 'official',
                type: {
                    coding: [
                        { system: CS.V2_0203, code: 'PRN', display: 'Provider number' },
                        {
                            system: CS.COL_ORG_ID,
                            code: 'CodigoPrestador',
                            display: 'Código de habilitación de prestador de servicios de salud',
                        },
                    ],
                },
                system: NS.REPS,
                value: tenant.institution_code,
            },
        ],
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildPractitionerResource(pr: RDAAmbulatoryPractitioner): object {
    const { givenN, fatherFN, motherFN } = decomposeName(pr.doctor_name);
    const familyN = [fatherFN, motherFN].filter(Boolean).join(' ');
    const familyExts: object[] = [
        { url: EXT.FATHERS_FAMILY_NAME, valueString: fatherFN },
        ...(motherFN ? [{ url: EXT.MOTHERS_FAMILY_NAME, valueString: motherFN }] : []),
    ];

    return {
        resourceType: 'Practitioner',
        id: `CC-${pr.doctor_license}`,
        meta: { profile: [PROFILES.PRACTITIONER] },
        identifier: [{
            id: 'NationalPersonIdentifier-0',
            use: 'official',
            type: {
                coding: [
                    { system: CS.V2_0203, code: 'PN', display: 'Person number' },
                    { system: CS.COL_PERSON_ID, code: 'CC', display: 'Cédula ciudadanía' },
                ],
            },
            value: pr.doctor_license,
        }],
        name: [{
            use: 'official',
            family: familyN,
            _family: { extension: familyExts },
            given: givenN,
        }],
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildEncounterResource(
    enc: RDAAmbulatoryEncounter,
    patientRef: string,
    practitionerRef: string,
    orgRef: string,
    locationId: string,
    conditions: RDAAmbulatoryCondition[],
): object {
    const dischargeExt = enc.discharge_disposition_code ? [{
        url: EXT.DISCHARGE_DISPOSITION,
        extension: [
            {
                url: 'DispositionCode',
                valueCoding: {
                    system: CS.COL_DISCHARGE_DISP,
                    code: enc.discharge_disposition_code,
                    display: enc.discharge_disposition_display ?? enc.discharge_disposition_code,
                },
            },
            {
                url: 'ReferenceOrganization',
                valueReference: { reference: orgRef },
            },
        ],
    }] : [];

    const diagnosisEntries = conditions.map((c, i) => {
        const d: any = {
            id: i === 0 ? 'MainDiagnosis' : `Diagnosis-${i}`,
            condition: { reference: frag(`Condition-${c.id}`) },
            rank: c.rank ?? (i + 1),
        };
        if (c.diagnosis_type_code) {
            d.extension = [{
                url: EXT.DIAGNOSIS_TYPE,
                valueCoding: {
                    system: CS.COL_DIAGNOSIS_TYPE,
                    code: c.diagnosis_type_code,
                    display: c.diagnosis_type_display ?? c.diagnosis_type_code,
                },
            }];
        }
        if (c.diagnosis_role_code) {
            d.use = {
                coding: [{
                    system: CS.COL_DIAGNOSIS_ROLE,
                    code: c.diagnosis_role_code,
                    display: c.diagnosis_role_display ?? c.diagnosis_role_code,
                }],
            };
        }
        return d;
    });

    const encounterTypes: object[] = [];
    if (enc.tech_modality_code) {
        encounterTypes.push({
            coding: {
                system: CS.COL_TECH_MODALITY,
                code: enc.tech_modality_code,
                display: enc.tech_modality_display ?? enc.tech_modality_code,
            },
        });
    }
    if (enc.service_group_code) {
        encounterTypes.push({
            coding: {
                system: CS.COL_SERVICE_GROUP,
                code: enc.service_group_code,
                display: enc.service_group_display ?? enc.service_group_code,
            },
        });
    }
    if (enc.reps_service_code) {
        encounterTypes.push({
            coding: {
                system: CS.REPS_SERVICES,
                code: enc.reps_service_code,
                display: enc.reps_service_display ?? enc.reps_service_code,
            },
        });
    }
    if (enc.care_setting_code) {
        encounterTypes.push({
            coding: {
                system: CS.ENTORNO_ATENCION,
                code: enc.care_setting_code,
                display: enc.care_setting_display ?? enc.care_setting_code,
            },
        });
    }

    return {
        resourceType: 'Encounter',
        id: 'Encounter-0',
        meta: { profile: [PROFILES.ENCOUNTER] },
        identifier: [{
            id: 'EncounterIdentifier',
            use: 'usual',
            system: NS.ENCOUNTERS,
            value: enc.encounter_id,
        }],
        status: 'finished',
        class: {
            system: CS.V3_ACT_CODE,
            code: 'AMB',
            display: 'ambulatory',
        },
        ...(encounterTypes.length > 0 && { type: encounterTypes }),
        ...(enc.cups_service_code && {
            serviceType: {
                coding: {
                    system: CS.CUPS,
                    code: enc.cups_service_code,
                    display: enc.cups_service_display ?? enc.cups_service_code,
                },
            },
        }),
        subject: { reference: patientRef },
        participant: [{
            id: 'AttenderPhysician',
            type: [{
                coding: [{
                    system: CS.V3_PARTICIPATION,
                    code: 'ATND',
                    display: 'attender',
                }],
            }],
            individual: { reference: practitionerRef },
        }],
        period: {
            start: enc.period_start,
            ...(enc.period_end && { end: enc.period_end }),
        },
        ...(enc.external_cause_code && {
            reasonCode: [{
                coding: [{
                    system: CS.RIPS_CAUSE_EXT,
                    code: enc.external_cause_code,
                    display: enc.external_cause_display ?? enc.external_cause_code,
                }],
            }],
        }),
        ...(diagnosisEntries.length > 0 && { diagnosis: diagnosisEntries }),
        ...(dischargeExt.length > 0 && { extension: dischargeExt }),
        location: [{ location: { reference: frag(locationId) } }],
        serviceProvider: { reference: orgRef },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildLocationResource(tenant: RDAAmbulatoryTenant): object {
    const locationId = `${tenant.institution_code}-01`;
    return {
        resourceType: 'Location',
        id: locationId,
        meta: { profile: [PROFILES.LOCATION] },
        identifier: [{
            use: 'official',
            system: NS.REPS,
            value: locationId,
        }],
        name: tenant.location_name ?? tenant.name ?? tenant.institution_code,
        managingOrganization: { reference: frag(tenant.institution_code) },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildConditionResource(c: RDAAmbulatoryCondition, pRef: string): object {
    const codeField: any = { text: c.condition_display };
    if (c.condition_code) {
        codeField.coding = [{
            system: CS.ICD10,
            code: c.condition_code,
            display: c.condition_display,
        }];
    }

    const clinicalStatus = c.clinical_status ?? 'active';
    const verificationStatus = c.verification_status ?? 'confirmed';

    return {
        resourceType: 'Condition',
        id: `Condition-${c.id}`,
        meta: { profile: [PROFILES.CONDITION] },
        clinicalStatus: {
            coding: [{
                code: clinicalStatus,
                system: CS.CONDITION_CLINICAL,
                display: clinicalStatus.charAt(0).toUpperCase() + clinicalStatus.slice(1),
            }],
        },
        verificationStatus: {
            coding: [{
                code: verificationStatus,
                display: verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1),
            }],
        },
        category: [{
            coding: [{
                system: CS.CONDITION_CATEGORY,
                code: c.condition_category ?? 'encounter-diagnosis',
                display: 'Encounter Diagnosis',
            }],
        }],
        code: codeField,
        subject: { reference: pRef },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildAllergyResource(
    a: RDAAmbulatoryAllergy,
    pRef: string,
    encounterRef: string,
): object {
    return {
        resourceType: 'AllergyIntolerance',
        id: `AllergyIntolerance-${a.id}`,
        meta: { profile: [PROFILES.ALLERGY] },
        clinicalStatus: {
            coding: [{ code: a.status ?? 'active', display: 'Active' }],
        },
        code: {
            coding: [{
                system: CS.COL_ALLERGY_TYPE,
                code: a.allergen_type_code ?? '01',
                display: a.allergen_type_display ?? 'Medicamento',
            }],
            text: a.allergen,
        },
        patient: { reference: pRef },
        encounter: { reference: encounterRef },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildRiskAssessmentResource(
    r: RDAAmbulatoryRiskFactor,
    pRef: string,
    encounterRef: string,
): object {
    return {
        resourceType: 'RiskAssessment',
        id: `RiskAssessment-${r.id}`,
        meta: { profile: [PROFILES.RISK_ASSESSMENT] },
        status: 'registered',
        code: {
            coding: [{
                system: CS.FACTOR_RIESGO,
                code: r.risk_code,
                display: r.risk_display,
            }],
            ...(r.risk_text && { text: r.risk_text }),
        },
        subject: { reference: pRef },
        encounter: { reference: encounterRef },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildMedicationRequestResource(
    m: RDAAmbulatoryMedicationRequest,
    pRef: string,
    encounterRef: string,
    practitionerRef: string,
    conditionRef?: string,
): object {
    const dosageInstruction: any = {};

    if (m.dosage_text) dosageInstruction.text = m.dosage_text;
    if (m.patient_instruction) dosageInstruction.patientInstruction = m.patient_instruction;

    if (m.special_instruction_code) {
        dosageInstruction.additionalInstruction = {
            coding: [{
                system: CS.MIPRES_INSTRUCTION,
                code: m.special_instruction_code,
                display: m.special_instruction_display ?? m.special_instruction_code,
            }],
        };
    }

    if (m.duration_days !== undefined || m.frequency_code) {
        dosageInstruction.timing = {
            ...(m.duration_days !== undefined && {
                repeat: { duration: m.duration_days, durationUnit: 'd' },
            }),
            ...(m.frequency_code && {
                code: {
                    coding: [{
                        system: CS.MEDICATION_TIME,
                        code: m.frequency_code,
                        display: m.frequency_display ?? m.frequency_code,
                    }],
                },
            }),
        };
    }

    if (m.route_code) {
        dosageInstruction.route = {
            coding: [{
                system: CS.VAD,
                code: m.route_code,
                display: m.route_display ?? m.route_code,
            }],
        };
    }

    if (m.dose_value !== undefined) {
        dosageInstruction.doseAndRate = [{
            doseQuantity: {
                value: m.dose_value,
                unit: m.dose_unit ?? '',
                ...(m.dose_unit_code && { system: CS.UMM, code: m.dose_unit_code }),
            },
        }];
    }

    const dispenseExt: object[] = [];
    if (m.dispense_quantity_value !== undefined && m.dispense_unit_code) {
        dispenseExt.push({
            url: EXT.DISPENSE_QUANTITY,
            valueQuantity: {
                system: CS.MIPRES_DISPENSE_UNIT,
                code: m.dispense_unit_code,
                value: m.dispense_quantity_value,
                unit: m.dispense_quantity_unit ?? '',
            },
        });
    }

    return {
        resourceType: 'MedicationRequest',
        id: `MedicationRequest-${m.id}`,
        meta: { profile: [PROFILES.MEDICATION_REQUEST] },
        status: 'active',
        intent: 'order',
        category: [{
            coding: [{
                system: CS.COL_HEALTH_TECH_CAT,
                code: m.category_code ?? '02',
                display: m.category_display ?? 'Medicamento con registro sanitario',
            }],
        }],
        reportedBoolean: true,
        medicationCodeableConcept: {
            coding: [{
                system: CS.IUM_PRIMER_NIVEL,
                code: m.medication_code ?? '0',
                display: m.medication_display.toUpperCase(),
            }],
        },
        subject: { reference: pRef },
        encounter: { reference: encounterRef },
        authoredOn: m.authored_on ?? nowISO(),
        requester: { reference: practitionerRef },
        ...(m.reason_code && {
            reasonCode: [{
                coding: [{
                    system: CS.RIPS_FINALIDAD,
                    code: m.reason_code,
                    display: m.reason_display ?? m.reason_code,
                }],
            }],
        }),
        ...(conditionRef && { reasonReference: { reference: conditionRef } }),
        ...(m.prescription_number && {
            groupIdentifier: {
                system: 'https://example.org/NamingSystem/NumeroPrescripcion',
                value: m.prescription_number,
            },
        }),
        ...(Object.keys(dosageInstruction).length > 0 && {
            dosageInstruction: [dosageInstruction],
        }),
        ...((dispenseExt.length > 0 || m.dispense_quantity_value !== undefined) && {
            dispenseRequest: {
                ...(dispenseExt.length > 0 && { extension: dispenseExt }),
                ...(m.number_of_repeats !== undefined && {
                    numberOfRepeatsAllowed: m.number_of_repeats,
                }),
                ...(m.dispense_quantity_value !== undefined && {
                    quantity: {
                        value: m.dispense_quantity_value,
                        unit: m.dispense_quantity_unit ?? '',
                        system: CS.MIPRES_DISPENSE_UNIT,
                        code: m.dispense_unit_code ?? '',
                    },
                }),
            },
        }),
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildServiceRequestResource(
    s: RDAAmbulatoryServiceRequest,
    index: number,
    pRef: string,
    encounterRef: string,
    practitionerRef: string,
): object {
    const hasCups = !!s.cups_code;
    const profile = hasCups ? PROFILES.SERVICE_REQUEST_PROC : PROFILES.SERVICE_REQUEST_OTHER;

    const codeField: any = hasCups
        ? { coding: [{ system: CS.CUPS, code: s.cups_code, display: s.cups_display ?? s.cups_code }] }
        : { text: s.description ?? 'Sin descripción' };

    return {
        resourceType: 'ServiceRequest',
        id: `ServiceRequest-${index}`,
        meta: { profile: [profile] },
        status: 'active',
        intent: 'order',
        category: [{
            coding: [{
                system: CS.COL_HEALTH_TECH_CAT,
                code: s.category_code ?? '01',
                display: s.category_display ?? 'Procedimiento en salud',
            }],
        }],
        code: codeField,
        subject: { reference: pRef },
        encounter: { reference: encounterRef },
        authoredOn: s.authored_on ?? nowISO(),
        requester: { reference: practitionerRef },
        ...(s.reason_code && {
            reasonCode: [{
                coding: [{
                    system: CS.RIPS_FINALIDAD,
                    code: s.reason_code,
                    display: s.reason_display ?? s.reason_code,
                }],
            }],
        }),
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildObservationIncapacidadResource(
    inc: RDAAmbulatoryIncapacidad,
    pRef: string,
    encounterRef: string,
): object {
    const components: object[] = [];

    if (inc.scope_code) {
        components.push({
            id: 'LicenseScope',
            code: {
                coding: [{ system: CS.SNOMED, code: '255590007', display: 'alcance' }],
                text: 'Incapacidad - Alcance de la incapacidad',
            },
            valueCodeableConcept: {
                coding: [{
                    system: CS.COL_LICENSE_SCOPE,
                    code: inc.scope_code,
                    display: inc.scope_display ?? inc.scope_code,
                }],
            },
        });
    }

    if (inc.days !== undefined) {
        components.push({
            id: 'MaternityLicenseTime',
            code: {
                coding: [{ system: CS.SNOMED, code: '410670007', display: 'tiempo' }],
                text: 'Días de licencia de maternidad',
            },
            valueQuantity: {
                value: inc.days,
                unit: 'días',
                system: CS.UCUM,
                code: 'd',
            },
        });
    }

    return {
        resourceType: 'Observation',
        id: 'Observation-0',
        meta: { profile: [PROFILES.OBSERVATION_INCAP] },
        status: 'final',
        code: {
            coding: [{ system: CS.SNOMED, code: '160983005', display: 'permiso de concurrencia' }],
            text: 'Datos incapacidad (SIPE – Sistema de Incapacidades y Prestaciones Economicas)',
        },
        subject: { reference: pRef },
        encounter: { reference: encounterRef },
        ...(components.length > 0 && { component: components }),
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildObservationOcupacionResource(
    occ: RDAAmbulatoryOcupacion,
    pRef: string,
): object {
    return {
        resourceType: 'Observation',
        id: 'Observation-1',
        meta: { profile: [PROFILES.OBSERVATION_OCUP] },
        status: 'final',
        code: {
            coding: [{ system: CS.SNOMED, code: '184104002', display: 'ocupación del paciente' }],
            text: 'Ocupación del paciente en el momento de la atención',
        },
        subject: { reference: pRef },
        valueCodeableConcept: {
            coding: [{
                system: CS.COL_OCCUPATION,
                code: occ.occupation_code,
                display: occ.occupation_display,
            }],
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildPaymentSourceResource(ps: RDAAmbulatoryPaymentSource): object {
    return {
        resourceType: 'Organization',
        id: ps.id,
        name: ps.name,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildDocumentReferenceResource(
    doc: RDAAmbulatoryDocumentReference,
    pRef: string,
    orgRef: string,
): object {
    const typeCoding: object[] = [];
    if (doc.loinc_code) typeCoding.push({ system: CS.LOINC, code: doc.loinc_code, display: doc.loinc_display ?? doc.loinc_code });
    if (doc.doc_type_code) typeCoding.push({ system: CS.COL_DOC_TYPES, code: doc.doc_type_code, display: doc.doc_type_display ?? doc.doc_type_code });

    return {
        resourceType: 'DocumentReference',
        id: `DocumentReference-${doc.id}`,
        meta: { profile: [PROFILES.DOCUMENT_REFERENCE] },
        text: {
            status: 'generated',
            div: '<div xmlns="http://www.w3.org/1999/xhtml">Document Reference</div>',
        },
        status: 'current',
        type: { coding: typeCoding.length > 0 ? typeCoding : [{ system: CS.LOINC, code: '18842-5', display: 'Discharge summary' }] },
        category: [{
            coding: [{ system: CS.LOINC, code: '55108-5', display: 'Clinical presentation Document' }],
        }],
        subject: { reference: pRef },
        date: doc.date ?? nowISO(),
        author: [{ reference: orgRef }],
        custodian: { reference: 'Organization/MinSalud' },
        description: doc.description ?? 'Documento de soporte RDA',
        securityLabel: [{
            coding: [{
                system: CS.CONFIDENTIALITY,
                code: 'N',
                display: 'Normal',
            }],
        }],
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildCompositionResource(opts: {
    patientRef: string;
    orgRef: string;
    practitionerRef: string;
    encounterRef: string;
    compositionDate?: string;
    eventStart?: string;
    eventEnd?: string;
    attesterRef: string;
    sections: object[];
}): object {
    return {
        resourceType: 'Composition',
        meta: { profile: [PROFILES.COMPOSITION] },
        status: 'final',
        type: {
            coding: [{
                system: CS.LOINC,
                code: '51845-6',
                display: 'Outpatient Consult note',
            }],
        },
        subject: { reference: opts.patientRef },
        encounter: { reference: opts.encounterRef },
        date: opts.compositionDate ?? nowISO(),
        author: [{ reference: opts.orgRef }],
        title: 'RDA Consulta',
        confidentiality: 'N',
        attester: [{
            mode: 'legal',
            party: { reference: opts.attesterRef },
        }],
        custodian: { reference: opts.orgRef },
        event: {
            period: {
                start: toDateString(opts.eventStart),
                ...(opts.eventEnd && { end: toDateString(opts.eventEnd) }),
            },
        },
        section: opts.sections,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADUCTOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export class RDAAmbulatoryTranslator {

    static translate(input: RDAAmbulatoryInput): object {

        // ── IDs internos ──────────────────────────────────────────────────────
        const idType   = input.patient.identifier_type ?? 'CC';
        const idValue  = input.patient.identifier_value;
        const patientId    = `${idType}-${idValue}`;
        const orgId        = input.tenant.institution_code;
        const practId      = `CC-${input.practitioner.doctor_license}`;
        const locationId   = `${orgId}-01`;
        const paymentId    = input.payment_source?.id ?? 'PaymentSource-0';

        const pRef    = frag(patientId);
        const oRef    = frag(orgId);
        const prRef   = frag(practId);
        const encRef  = frag('Encounter-0');
        const locRef  = frag(locationId);   // usado por buildEncounterResource vía locationId

        // ── Recursos clínicos ─────────────────────────────────────────────────
        const conditions        = input.conditions        ?? [];
        const allergies         = input.allergies         ?? [];
        const riskFactors       = input.risk_factors      ?? [];
        const medicationRequests= input.medication_requests ?? [];
        const serviceRequests   = input.service_requests  ?? [];
        const documentRefs      = input.document_references ?? [];

        const conditionResources = conditions.map(c => buildConditionResource(c, pRef));

        const allergyResources = allergies.map(a =>
            buildAllergyResource(a, pRef, encRef));

        const riskResources = riskFactors.map(r =>
            buildRiskAssessmentResource(r, pRef, encRef));

        const medicationResources = medicationRequests.map(m => {
            const linkedCondId = m.reason_condition_id
                ? frag(`Condition-${m.reason_condition_id}`)
                : undefined;
            return buildMedicationRequestResource(m, pRef, encRef, prRef, linkedCondId);
        });

        const serviceResources = serviceRequests.map((s, i) =>
            buildServiceRequestResource(s, i, pRef, encRef, prRef));

        const docRefResources = documentRefs.map(d =>
            buildDocumentReferenceResource(d, pRef, oRef));

        // ── Observaciones opcionales ──────────────────────────────────────────
        const incapObs = input.incapacidad
            ? buildObservationIncapacidadResource(input.incapacidad, pRef, encRef)
            : null;

        const ocupObs = input.ocupacion
            ? buildObservationOcupacionResource(input.ocupacion, pRef)
            : null;

        const paymentOrg = input.payment_source
            ? buildPaymentSourceResource(input.payment_source)
            : null;

        // ── Encounter ─────────────────────────────────────────────────────────
        const encounterResource = buildEncounterResource(
            input.encounter,
            pRef, prRef, oRef, locationId, conditions,
        );

        // ── Composition sections ──────────────────────────────────────────────
        const sections: object[] = [
            buildSection(
                'Entidad(es) responsable(s) por el plan de beneficios en salud (consulta)',
                '48768-6', 'Payment sources Document',
                paymentOrg ? [frag(paymentId)] : [],
            ),
            buildSection(
                'Otros datos demográficos',
                '74208-0', 'Demographic information + History of occupation Document',
                ocupObs ? [frag('Observation-1')] : [],
            ),
            buildSection(
                'Datos incapacidad (SIPE – Sistema de Incapacidades y Prestaciones Economicas)',
                '105583-9', 'Worker Sick leave form',
                incapObs ? [frag('Observation-0')] : [],
            ),
            buildSection(
                'Historial de diagnósticos de problemas de salud',
                '11450-4', 'Problem list - Reported',
                conditions.map(c => frag(`Condition-${c.id}`)),
            ),
            buildSection(
                'Historial de alergias, intolerancias y reacciones adversas',
                '48765-2', 'Allergies and adverse reactions Document',
                allergies.map(a => frag(`AllergyIntolerance-${a.id}`)),
            ),
            buildSection(
                'Factores de riesgo',
                '75492-9', 'Risk assessment and screening note',
                riskFactors.map(r => frag(`RiskAssessment-${r.id}`)),
            ),
            buildSection(
                'Historial de medicamentos',
                '10160-0', 'History of Medication use Narrative',
                medicationRequests.map(m => frag(`MedicationRequest-${m.id}`)),
            ),
            buildSection(
                'Órdenes, prescripciones o solicitudes de servicio',
                '61146-1', 'Orders for services Document',
                serviceRequests.map((_, i) => frag(`ServiceRequest-${i}`)),
            ),
            buildSection(
                'Documentos de soporte',
                '55107-7', 'Addendum Document',
                documentRefs.map(d => frag(`DocumentReference-${d.id}`)),
            ),
        ];

        // ── Composition ───────────────────────────────────────────────────────
        const compositionResource = buildCompositionResource({
            patientRef:      pRef,
            orgRef:          oRef,
            practitionerRef: prRef,
            encounterRef:    encRef,
            compositionDate: input.composition_date,
            eventStart:      input.event_start,
            eventEnd:        input.event_end,
            attesterRef:     prRef,          // médico como atestador legal
            sections,
        });

        // ── Ensamblar entries ─────────────────────────────────────────────────
        const wrap = (resource: object) => ({ resource });

        const entries: object[] = [
            wrap(compositionResource),
            wrap(buildPatientResource(input.patient)),
            wrap(buildOrganizationResource(input.tenant)),
            wrap(buildPractitionerResource(input.practitioner)),
            ...conditionResources.map(wrap),
            ...allergyResources.map(wrap),
            wrap(encounterResource),
            wrap(buildLocationResource(input.tenant)),
            ...(incapObs ? [wrap(incapObs)] : []),
            ...(ocupObs  ? [wrap(ocupObs)]  : []),
            ...riskResources.map(wrap),
            ...(paymentOrg ? [wrap(paymentOrg)] : []),
            ...medicationResources.map(wrap),
            ...serviceResources.map(wrap),
            ...docRefResources.map(wrap),
        ];

        return {
            resourceType: 'Bundle',
            language: 'es-CO',
            type: 'document',
            entry: entries,
        };
    }
}
