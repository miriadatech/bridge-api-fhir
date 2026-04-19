// src/translators/RDAPatientStatementTranslator.ts
// Versión 4.0 — alineación exacta con JSON oficial MinSalud RDA

import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE ENTRADA
// ─────────────────────────────────────────────────────────────────────────────

export interface RDAPatientRow {
    id: string;
    identifier_type: string;
    identifier_value: string;
    given_name: string;
    middle_name?: string;
    family_name: string;
    father_family_name?: string;
    mother_family_name?: string;
    gender: string;
    birth_date: string;
    birth_time?: string;
    address_city?: string;
    divipola_code?: string;
    residence_zone_code?: string;
    residence_zone_display?: string;
    nationality_code?: string;
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

export interface RDATenantRow {
    id: string;
    name: string;
    institution_code: string;
    nit?: string;
}

export interface RDAPractitionerRow {
    doctor_name: string;
    doctor_license?: string;
    consultation_date: Date | string;
}

export interface RDAConditionRow {
    id: string;
    condition_code?: string;          // opcional — el Ministerio acepta solo "text"
    condition_display: string;
    clinical_status: string;
    condition_category?: string;
}

export interface RDAAllergyRow {
    id: string;
    allergen: string;
    allergen_type?: string;
    allergen_type_code?: string;
    status?: string;
}

export interface RDAFamilyHistoryRow {
    id: string;
    relationship_code: string;
    relationship_display: string;
    condition_code: string;
    condition_display: string;
    status?: string;
}

export interface RDAMedicationRow {
    id: string;
    generic_name: string;
    brand_name?: string;
    medication_code?: string;
    status: string;
}

export interface RDAPatientStatementInput {
    patient: RDAPatientRow;
    tenant: RDATenantRow;
    practitioner: RDAPractitionerRow;
    conditions: RDAConditionRow[];
    allergies: RDAAllergyRow[];
    familyHistory: RDAFamilyHistoryRow[];
    medications: RDAMedicationRow[];
    eventStart?: Date | string;
    eventEnd?: Date | string;
    techModalityCode?: string;
    techModalityDisplay?: string;
    serviceGroupCode?: string;
    serviceGroupDisplay?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES OFICIALES
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://fhir.minsalud.gov.co/rda';

const PROFILES = {
    COMPOSITION: `${BASE}/StructureDefinition/CompositionPatientStatementRDA`,
    PATIENT: `${BASE}/StructureDefinition/PatientRDA`,
    ORGANIZATION: `${BASE}/StructureDefinition/CareDeliveryOrganizationRDA`,
    PRACTITIONER: `${BASE}/StructureDefinition/PractitionerRDA`,
    CONDITION: `${BASE}/StructureDefinition/ConditionStatementRDA`,
    ALLERGY: `${BASE}/StructureDefinition/AllergyIntoleranceStatementRDA`,
    FAMILY_HISTORY: `${BASE}/StructureDefinition/FamilyMemberHistoryRDA`,
    MEDICATION_STATEMENT: `${BASE}/StructureDefinition/MedicationStatementRDA`,
};

const EXT = {
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
};

const CS = {
    LOINC: 'http://loinc.org',
    ICD10: 'http://hl7.org/fhir/sid/icd-10',
    V2_0203: 'http://terminology.hl7.org/CodeSystem/v2-0203',
    CONDITION_CLINICAL: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
    CONDITION_CATEGORY: 'http://terminology.hl7.org/CodeSystem/condition-category',
    ALLERGY_CLINICAL: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
    ALLERGY_VERIF: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
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
    COL_RELATIONSHIP: `${BASE}/CodeSystem/ParentescoAntecedente`,
    COL_MEDICATION: `${BASE}/CodeSystem/MipresINN`,
    ISO_3166_1: `${BASE}/CodeSystem/ISO31661`,
    DIVIPOLA: `${BASE}/CodeSystem/DIVIPOLA`,
};

const NS = {
    RNEC: `${BASE}/NamingSystem/RNEC`,
    REPS: `${BASE}/NamingSystem/REPS`,
};

const LOINC_CODES = {
    PATIENT_SUMMARY: '102089-0',
    PROBLEM_LIST: '11450-4',
    ALLERGIES: '48765-2',
    MEDICATIONS: '10160-0',
    FAMILY_HISTORY: '10157-6',
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

/**
 * Referencia interna tipo fragmento usada dentro del mismo Bundle:
 * #CC-000000000, #Condition-0, #Códigohabilitaciónprestador, etc.
 */
const frag = (id: string) => `#${id}`;

// ─────────────────────────────────────────────────────────────────────────────
// RECURSOS FHIR
// ─────────────────────────────────────────────────────────────────────────────

function buildPatientResource(p: RDAPatientRow): object {
    const idType = p.identifier_type ?? 'CC';
    const internalId = `${idType}-${p.identifier_value}`;

    // Extensiones opcionales (solo si tienen valor)
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

    // Apellidos compuestos
    const familyName = [p.father_family_name, p.mother_family_name]
        .filter(Boolean).join(' ') || p.family_name;

    const familyExts: object[] = [];
    if (p.father_family_name) {
        familyExts.push({
            url: EXT.FATHERS_FAMILY_NAME,
            valueString: p.father_family_name,
        });
    }
    if (p.mother_family_name) {
        familyExts.push({
            url: EXT.MOTHERS_FAMILY_NAME,
            valueString: p.mother_family_name,
        });
    }

    const resource: any = {
        resourceType: 'Patient',
        id: internalId,
        meta: { profile: [PROFILES.PATIENT] },
        ...(extensions.length > 0 && { extension: extensions }),
        identifier: [
            {
                // ORDEN EXACTO del ministerio: type → id → use → system → value
                type: {
                    coding: [
                        {
                            system: CS.V2_0203,
                            code: 'PN',
                            display: 'Person number',
                        },
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
            },
        ],
        name: [
            {
                given: [p.given_name, p.middle_name].filter(Boolean) as string[],
                use: 'official',
                family: familyName,
                ...(familyExts.length > 0 && {
                    _family: { extension: familyExts },
                }),
            },
        ],
        // address se agrega abajo si hay datos
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
            _birthDate: {
                extension: [{
                    url: EXT.BIRTH_TIME,
                    valueTime: p.birth_time,
                }],
            },
        }),
        deceasedBoolean: p.deceased ?? false,
    };

    // Dirección (opcional)
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
                        valueCoding: {
                            code: p.divipola_code,
                            system: CS.DIVIPOLA,
                        },
                    }],
                },
            }),
            country: 'Colombia',
            _country: {
                extension: [{
                    url: EXT.COUNTRY_CODE,
                    valueCoding: {
                        system: CS.ISO_3166_1,
                        code: p.nationality_code ?? '170',
                    },
                }],
            },
            ...(addrExts.length > 0 && { extension: addrExts }),
        }];
    }

    return resource;
}

// ─────────────────────────────────────────────────────────────────────────────

function buildOrganizationResource(tenant: RDATenantRow): object {
    // NOTA: El JSON del Ministerio NO incluye "name" en Organization
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
                        {
                            system: CS.V2_0203,
                            code: 'TAX',
                            display: 'Tax ID number',
                        },
                        {
                            system: CS.COL_ORG_ID,
                            code: 'NIT',
                            display: 'Número de Identificación Tributaria',
                        },
                    ],
                },
                value: tenant.nit ?? 'Desconocido',
            },
            {
                id: 'HealthcareProviderIdentifier-0',
                use: 'official',
                type: {
                    coding: [
                        {
                            system: CS.V2_0203,
                            code: 'PRN',
                            display: 'Provider number',
                        },
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

// ─────────────────────────────────────────────────────────────────────────────
// TÍTULOS DE CORTESÍA A ELIMINAR
// ─────────────────────────────────────────────────────────────────────────────

const HONORIFICS = new Set([
    'dr.', 'dr', 'dra.', 'dra', 'lic.', 'lic', 'mg.', 'mg',
    'esp.', 'esp', 'prof.', 'prof', 'ing.', 'ing', 'mr.', 'mr',
    'mrs.', 'mrs', 'ms.', 'ms', 'phd.', 'phd',
]);

/**
 * Normaliza el nombre del médico eliminando títulos y distribuyendo
 * correctamente las partes en given / family según convención colombiana:
 *
 *   Regla: el penúltimo token es apellido paterno (fatherFamilyName)
 *          el último token es apellido materno (motherFamilyName) — si hay ≥ 2 apellidos
 *          los tokens anteriores son nombres de pila (given)
 *
 * Ejemplos:
 *   "Dr. Carlos García"          → given: ["Carlos"],        family: "García"
 *   "Carlos García López"        → given: ["Carlos"],        family: "García López"
 *   "María José Rodríguez Peña"  → given: ["María","José"],  family: "Rodríguez Peña"
 *   "Juan Médico"                → given: ["Juan"],          family: "Médico"
 */
function buildPractitionerResource(
    pr: RDAPractitionerRow,
    license: string,
): object {
    // 1. Tokenizar y eliminar títulos de cortesía
    const rawParts = pr.doctor_name.trim().split(/\s+/);
    const parts = rawParts.filter(token => !HONORIFICS.has(token.toLowerCase()));

    // 2. Guardia: si después de filtrar no hay tokens, usar el nombre original
    const safeParts = parts.length > 0 ? parts : rawParts;

    // 3. Distribuir según cantidad de tokens limpios
    let givenN: string[];
    let fatherFN: string;
    let motherFN: string;

    if (safeParts.length === 1) {
        // Solo un token → tratarlo como nombre, sin apellido separado
        givenN = [safeParts[0]];
        fatherFN = safeParts[0];
        motherFN = '';
    } else if (safeParts.length === 2) {
        // "Carlos García" → given: ["Carlos"], father: "García"
        givenN = [safeParts[0]];
        fatherFN = safeParts[1];
        motherFN = '';
    } else {
        // 3+ tokens: últimos 2 son apellidos, el resto son nombres de pila
        // "Carlos Alberto García López" → given: ["Carlos","Alberto"], father: "García", mother: "López"
        fatherFN = safeParts[safeParts.length - 2];
        motherFN = safeParts[safeParts.length - 1];
        givenN = safeParts.slice(0, -2);
    }

    const familyN = [fatherFN, motherFN].filter(Boolean).join(' ');

    // 4. Extensiones de apellidos (siempre incluye father; mother solo si existe)
    const familyExts: object[] = [
        { url: EXT.FATHERS_FAMILY_NAME, valueString: fatherFN },
        ...(motherFN ? [{ url: EXT.MOTHERS_FAMILY_NAME, valueString: motherFN }] : []),
    ];

    return {
        resourceType: 'Practitioner',
        id: `CC-${license}`,
        meta: { profile: [PROFILES.PRACTITIONER] },
        identifier: [
            {
                id: 'NationalPersonIdentifier-0',
                use: 'official',
                type: {
                    coding: [
                        {
                            system: CS.V2_0203,
                            code: 'PN',
                            display: 'Person number',
                        },
                        {
                            system: CS.COL_PERSON_ID,
                            code: 'CC',
                            display: 'Cédula ciudadanía',
                        },
                    ],
                },
                // NOTA: el JSON del Ministerio NO tiene "system" en Practitioner.identifier
                value: license,
            },
        ],
        name: [{
            use: 'official',
            family: familyN,
            _family: { extension: familyExts },
            given: givenN,
        }],
    };
}


// ─────────────────────────────────────────────────────────────────────────────

function buildSection(
    title: string,
    loincCode: string,
    loincDisplay: string,
    refs: string[],   // referencias de fragmento: #Condition-0, etc.
): object {
    const base = {
        title,
        code: {
            coding: [{
                system: CS.LOINC,
                code: loincCode,
                display: loincDisplay,
            }],
        },
    };

    // entry y emptyReason son MUTUAMENTE EXCLUYENTES
    if (refs.length > 0) {
        return { ...base, entry: refs.map(r => ({ reference: r })) };
    }

    return {
        ...base,
        emptyReason: {
            coding: [{
                system: CS.LIST_EMPTY_REASON,
                code: 'nilknown',
                display: 'Nil Known',
            }],
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildCompositionResource(opts: {
    patientRef: string;   // #CC-000000000
    orgRef: string;   // #Códigohabilitaciónprestador
    practitionerRef: string;   // #CC-111111111
    sectionEntries: {
        conditions: string[];
        allergies: string[];
        medications: string[];
        familyHistory: string[];
    };
    eventStart?: Date | string;
    eventEnd?: Date | string;
    techModalityCode?: string;
    techModalityDisplay?: string;
    serviceGroupCode?: string;
    serviceGroupDisplay?: string;
}): object {

    const techCode = opts.techModalityCode ?? '01';
    const techDisplay = opts.techModalityDisplay ?? 'Intramural';
    const svcCode = opts.serviceGroupCode ?? '01';
    const svcDisplay = opts.serviceGroupDisplay ?? 'Consulta externa';

    return {
        resourceType: 'Composition',
        // ⚠️  El JSON del Ministerio NO incluye "id" en la Composition
        meta: { profile: [PROFILES.COMPOSITION] },
        status: 'final',
        type: {
            coding: [{
                system: CS.LOINC,
                code: LOINC_CODES.PATIENT_SUMMARY,
                display: 'FHIR resource patient medical record',
            }],
        },
        subject: { reference: opts.patientRef },
        date: nowISO(),
        author: [{ reference: opts.practitionerRef }],
        title: 'Resumen Digital de Atención en Salud - RDA de antecedentes manifestados por el paciente',
        confidentiality: 'N',
        attester: [{
            mode: 'legal',
            party: { reference: opts.orgRef },
        }],
        custodian: { reference: opts.orgRef },
        event: [{
            code: [
                {
                    coding: [{
                        system: CS.COL_TECH_MODALITY,
                        code: techCode,
                        display: techDisplay,
                    }],
                },
                {
                    coding: [{
                        system: CS.COL_SERVICE_GROUP,
                        code: svcCode,
                        display: svcDisplay,
                    }],
                },
            ],
            period: {
                start: toDateString(opts.eventStart ?? new Date()),
                ...(opts.eventEnd && { end: toDateString(opts.eventEnd) }),
            },
        }],
        section: [
            buildSection(
                'Historial de diagnósticos de problemas de salud',
                LOINC_CODES.PROBLEM_LIST,
                'Problem list - Reported',
                opts.sectionEntries.conditions,
            ),
            buildSection(
                'Historial de alergias, intolerancias y reacciones adversas',
                LOINC_CODES.ALLERGIES,
                'Allergies and adverse reactions Document',
                opts.sectionEntries.allergies,
            ),
            buildSection(
                'Historial de medicamentos',
                LOINC_CODES.MEDICATIONS,
                'History of Medication use Narrative',
                opts.sectionEntries.medications,
            ),
            buildSection(
                'Historial de antecedentes familiares',
                LOINC_CODES.FAMILY_HISTORY,
                'History of family member diseases Narrative',
                opts.sectionEntries.familyHistory,
            ),
        ],
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildConditionResource(c: RDAConditionRow, pRef: string): object {
    // ⚠️  El JSON del Ministerio usa solo "text" en code, SIN coding ICD-10
    //     Solo agregamos coding si el condition_code está presente Y no es vacío
    const codeField: any = { text: c.condition_display };
    if (c.condition_code) {
        codeField.coding = [{
            system: CS.ICD10,
            code: c.condition_code,
            display: c.condition_display,
        }];
    }

    return {
        resourceType: 'Condition',
        id: `Condition-${c.id}`,
        meta: { profile: [PROFILES.CONDITION] },
        clinicalStatus: {
            coding: [{
                code: c.clinical_status ?? 'active',
                system: CS.CONDITION_CLINICAL,
                display: c.clinical_status === 'active' ? 'Active'
                    : c.clinical_status === 'inactive' ? 'Inactive'
                        : (c.clinical_status ?? 'Active'),
            }],
        },
        verificationStatus: {
            coding: [{
                code: 'unconfirmed',
                display: 'Unconfirmed',
                // ⚠️  El JSON del Ministerio NO tiene "system" en verificationStatus
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

function buildAllergyResource(a: RDAAllergyRow, pRef: string): object {
    // ⚠️  clinicalStatus del Ministerio NO tiene "system"
    return {
        resourceType: 'AllergyIntolerance',
        id: `AllergyIntolerance-${a.id}`,
        meta: { profile: [PROFILES.ALLERGY] },
        clinicalStatus: {
            coding: [{
                code: a.status ?? 'active',
                display: 'Active',
                // Sin "system" — igual que el JSON del ministerio
            }],
        },
        verificationStatus: {
            coding: [{
                code: 'unconfirmed',
                display: 'Unconfirmed',
            }],
        },
        code: {
            coding: [{
                system: CS.COL_ALLERGY_TYPE,
                code: a.allergen_type_code ?? '01',
                display: a.allergen_type ?? 'Medicamento',
            }],
            text: a.allergen,
        },
        patient: { reference: pRef },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildFamilyHistoryResource(fh: RDAFamilyHistoryRow, pRef: string): object {
    return {
        resourceType: 'FamilyMemberHistory',
        id: `FamilyMemberHistory-${fh.id}`,
        meta: { profile: [PROFILES.FAMILY_HISTORY] },
        status: fh.status ?? 'partial',
        patient: { reference: pRef },
        relationship: {
            coding: [{
                system: CS.COL_RELATIONSHIP,
                code: fh.relationship_code,
                display: fh.relationship_display,
            }],
        },
        condition: [{
            code: {
                coding: [{
                    system: CS.ICD10,
                    code: fh.condition_code,
                    display: fh.condition_display,
                }],
            },
        }],
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildMedicationStatementResource(m: RDAMedicationRow, pRef: string): object {
    return {
        resourceType: 'MedicationStatement',
        id: `MedicationStatement-${m.id}`,
        meta: { profile: [PROFILES.MEDICATION_STATEMENT] },
        status: m.status === 'active' ? 'active' : 'completed',
        medicationCodeableConcept: {
            coding: [{
                system: CS.COL_MEDICATION,
                code: m.medication_code ?? '0',
                display: m.generic_name.toUpperCase(),
            }],
            ...(m.brand_name && { text: `${m.generic_name} (${m.brand_name})` }),
        },
        subject: { reference: pRef },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADUCTOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export class RDAPatientStatementTranslator {

    static translate(input: RDAPatientStatementInput): object {

        const license = input.practitioner.doctor_license ?? uuidv4();

        const idType = input.patient.identifier_type ?? 'CC';
        const idValue = input.patient.identifier_value;

        // IDs internos de los recursos (sin UUID — igual que el ministerio)
        const patientId = `${idType}-${idValue}`;                 // CC-000000000
        const orgId = input.tenant.institution_code;          // Códigohabilitaciónprestador
        const practId = `CC-${license}`;                        // CC-111111111

        // Referencias internas con fragmento #
        const pRef = frag(patientId);    // #CC-000000000
        const oRef = frag(orgId);        // #Códigohabilitaciónprestador
        const prRef = frag(practId);      // #CC-111111111

        // ── Recursos clínicos ────────────────────────────────────────────────
        const conditionResources = input.conditions.map(c =>
            buildConditionResource(c, pRef));
        const allergyResources = input.allergies.map(a =>
            buildAllergyResource(a, pRef));
        const familyResources = input.familyHistory.map(fh =>
            buildFamilyHistoryResource(fh, pRef));
        const medicationResources = input.medications.map(m =>
            buildMedicationStatementResource(m, pRef));

        // ── Referencias de sección (fragmentos internos) ─────────────────────
        const sectionEntries = {
            conditions: input.conditions.map(c => frag(`Condition-${c.id}`)),
            allergies: input.allergies.map(a => frag(`AllergyIntolerance-${a.id}`)),
            medications: input.medications.map(m => frag(`MedicationStatement-${m.id}`)),
            familyHistory: input.familyHistory.map(fh => frag(`FamilyMemberHistory-${fh.id}`)),
        };

        // ── Composition ──────────────────────────────────────────────────────
        const compositionResource = buildCompositionResource({
            patientRef: pRef,
            orgRef: oRef,
            practitionerRef: prRef,
            sectionEntries,
            eventStart: input.eventStart,
            eventEnd: input.eventEnd,
            techModalityCode: input.techModalityCode,
            techModalityDisplay: input.techModalityDisplay,
            serviceGroupCode: input.serviceGroupCode,
            serviceGroupDisplay: input.serviceGroupDisplay,
        });

        // ── Ensamblar entries (sin fullUrl — igual que el ministerio) ────────
        const wrap = (resource: object) => ({ resource });

        const entries = [
            wrap(compositionResource),
            wrap(buildPatientResource(input.patient)),
            wrap(buildOrganizationResource(input.tenant)),
            wrap(buildPractitionerResource(input.practitioner, license)),
            ...conditionResources.map(wrap),
            ...allergyResources.map(wrap),
            ...familyResources.map(wrap),
            ...medicationResources.map(wrap),
        ];

        // ── Bundle Document (sin id, sin meta, sin identifier, sin timestamp)
        return {
            resourceType: 'Bundle',
            language: 'es-CO',
            type: 'document',
            entry: entries,
        };
    }
}
