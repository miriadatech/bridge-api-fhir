import type * as fhir from 'fhir/r4';

// ─────────────────────────────────────────────
// Tipos auxiliares para evitar errores de índice
// ─────────────────────────────────────────────
type FHIRContact = NonNullable<fhir.Patient['contact']>[number];
type FHIRIdentifier = NonNullable<fhir.Patient['identifier']>[number];
type FHIRHumanName = NonNullable<fhir.Patient['name']>[number];
type FHIRTelecom = NonNullable<fhir.Patient['telecom']>[number];
type FHIRAddress = NonNullable<fhir.Patient['address']>[number];
type FHIRExtension = NonNullable<fhir.Patient['extension']>[number];
type FHIRCoding = NonNullable<fhir.Coding>;

// ─────────────────────────────────────────────
// Interfaces locales
// ─────────────────────────────────────────────
export interface LocalPatient {
    id?: string;
    identifier_type: string;   // CC | TI | CE | PA | RC | MS
    identifier_value: string;
    family_name: string;
    given_name: string;
    middle_name?: string;
    birth_date: string;   // YYYY-MM-DD
    gender: string;   // male | female | other | unknown
    phone?: string;
    email?: string;
    address_line?: string;
    city?: string;
    department?: string;
    country?: string;
    marital_status?: string;
    blood_type?: string;   // A | B | AB | O
    rh_factor?: string;   // + | -
    ethnicity?: string;
    disability_status?: string;
    active?: boolean;
    ministry_id?: string;
    ministry_synced?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

// ─────────────────────────────────────────────
// Tablas de mapeo
// ─────────────────────────────────────────────
const IDENTIFIER_TYPE_MAP: Record<
    string,
    { system: string; code: string; display: string }
> = {
    CC: {
        system: 'https://www.registraduria.gov.co',
        code: 'CC',
        display: 'Cédula de Ciudadanía',
    },
    TI: {
        system: 'https://www.registraduria.gov.co',
        code: 'TI',
        display: 'Tarjeta de Identidad',
    },
    CE: {
        system: 'https://www.migracioncolombia.gov.co',
        code: 'CE',
        display: 'Cédula de Extranjería',
    },
    PA: {
        system: 'http://www.pasaporte.gov.co',
        code: 'PA',
        display: 'Pasaporte',
    },
    RC: {
        system: 'https://www.registraduria.gov.co',
        code: 'RC',
        display: 'Registro Civil',
    },
    MS: {
        system: 'https://www.minsalud.gov.co',
        code: 'MS',
        display: 'Número de Ministerio de Salud',
    },
};

const MARITAL_STATUS_MAP: Record<string, string> = {
    S: 'S',   // Soltero/a
    M: 'M',   // Casado/a
    D: 'D',   // Divorciado/a
    W: 'W',   // Viudo/a
    L: 'L',   // Separado/a legalmente
    U: 'U',   // Unión libre
};

// ─────────────────────────────────────────────
// Extensiones Colombia
// ─────────────────────────────────────────────
const EXT_BASE = 'https://minsalud.gov.co/fhir/StructureDefinition';

const COLOMBIA_EXTENSIONS = {
    bloodType: `${EXT_BASE}/blood-type`,
    rhFactor: `${EXT_BASE}/rh-factor`,
    ethnicity: `${EXT_BASE}/ethnicity`,
    disabilityStatus: `${EXT_BASE}/disability-status`,
} as const;

// ─────────────────────────────────────────────
// LOCAL → FHIR R4
// ─────────────────────────────────────────────
export function localToFHIR(patient: LocalPatient): fhir.Patient {
    const idTypeInfo = IDENTIFIER_TYPE_MAP[patient.identifier_type];

    // Identificador principal
    const identifier: FHIRIdentifier[] = [
        {
            use: 'official',
            system: idTypeInfo?.system ?? 'urn:oid:unknown',
            value: patient.identifier_value,
            type: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                        code: idTypeInfo?.code ?? patient.identifier_type,
                        display: idTypeInfo?.display ?? patient.identifier_type,
                    },
                ],
            },
        },
    ];

    // Nombre
    const givenNames: string[] = [patient.given_name];
    if (patient.middle_name) givenNames.push(patient.middle_name);

    const name: FHIRHumanName[] = [
        {
            use: 'official',
            family: patient.family_name,
            given: givenNames,
            text: `${patient.given_name}${patient.middle_name ? ' ' + patient.middle_name : ''} ${patient.family_name}`,
        },
    ];

    // Telecomunicaciones
    const telecom: FHIRTelecom[] = [];
    if (patient.phone) {
        telecom.push({ system: 'phone', value: patient.phone, use: 'mobile' });
    }
    if (patient.email) {
        telecom.push({ system: 'email', value: patient.email, use: 'home' });
    }

    // Dirección
    const address: FHIRAddress[] = [];
    if (patient.address_line || patient.city || patient.department) {
        address.push({
            use: 'home',
            line: patient.address_line ? [patient.address_line] : undefined,
            city: patient.city,
            state: patient.department,
            country: patient.country ?? 'CO',
            postalCode: undefined,
        });
    }

    // Estado civil
    const maritalStatus: fhir.Patient['maritalStatus'] = patient.marital_status
        ? {
            coding: [
                {
                    system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
                    code: MARITAL_STATUS_MAP[patient.marital_status] ?? patient.marital_status,
                    display: patient.marital_status,
                },
            ],
        }
        : undefined;

    // Extensiones Colombia
    const extension: FHIRExtension[] = [];

    if (patient.blood_type) {
        extension.push({
            url: COLOMBIA_EXTENSIONS.bloodType,
            valueString: patient.blood_type,
        });
    }

    if (patient.rh_factor) {
        extension.push({
            url: COLOMBIA_EXTENSIONS.rhFactor,
            valueString: patient.rh_factor,
        });
    }

    if (patient.ethnicity) {
        extension.push({
            url: COLOMBIA_EXTENSIONS.ethnicity,
            valueString: patient.ethnicity,
        });
    }

    if (patient.disability_status) {
        extension.push({
            url: COLOMBIA_EXTENSIONS.disabilityStatus,
            valueString: patient.disability_status,
        });
    }

    // Construcción del recurso FHIR
    const fhirPatient: fhir.Patient = {
        resourceType: 'Patient',
        id: patient.ministry_id ?? patient.id,
        active: patient.active ?? true,
        identifier,
        name,
        telecom: telecom.length > 0 ? telecom : undefined,
        gender: patient.gender as fhir.Patient['gender'],
        birthDate: patient.birth_date,
        address: address.length > 0 ? address : undefined,
        maritalStatus,
        extension: extension.length > 0 ? extension : undefined,
    };

    return fhirPatient;
}

// ─────────────────────────────────────────────
// FHIR R4 → LOCAL
// ─────────────────────────────────────────────
export function fhirToLocal(fhirPatient: fhir.Patient): Partial<LocalPatient> {
    // Identificador oficial
    const officialId = fhirPatient.identifier?.find(
        (id: FHIRIdentifier) => id.use === 'official',
    );

    const identifierType = officialId?.type?.coding?.[0]?.code ?? '';
    const identifierValue = officialId?.value ?? '';

    // Nombre oficial
    const officialName = fhirPatient.name?.find(
        (n: FHIRHumanName) => n.use === 'official',
    ) ?? fhirPatient.name?.[0];

    const familyName = officialName?.family ?? '';
    const givenNames = officialName?.given ?? [];
    const givenName = givenNames[0] ?? '';
    const middleName = givenNames[1];

    // Telecomunicaciones
    const phone = fhirPatient.telecom?.find(
        (t: FHIRTelecom) => t.system === 'phone',
    )?.value;

    const email = fhirPatient.telecom?.find(
        (t: FHIRTelecom) => t.system === 'email',
    )?.value;

    // Dirección
    const homeAddress = fhirPatient.address?.find(
        (a: FHIRAddress) => a.use === 'home',
    ) ?? fhirPatient.address?.[0];

    // Estado civil
    const maritalStatus = fhirPatient.maritalStatus?.coding?.[0]?.code;

    // Extensiones Colombia
    const getExtension = (url: string): string | undefined =>
        fhirPatient.extension?.find(
            (e: FHIRExtension) => e.url === url,
        )?.valueString;

    return {
        ministry_id: fhirPatient.id,
        ministry_synced: true,
        identifier_type: identifierType,
        identifier_value: identifierValue,
        family_name: familyName,
        given_name: givenName,
        middle_name: middleName,
        birth_date: fhirPatient.birthDate ?? '',
        gender: fhirPatient.gender ?? 'unknown',
        phone,
        email,
        address_line: homeAddress?.line?.[0],
        city: homeAddress?.city,
        department: homeAddress?.state,
        country: homeAddress?.country,
        marital_status: maritalStatus,
        blood_type: getExtension(COLOMBIA_EXTENSIONS.bloodType),
        rh_factor: getExtension(COLOMBIA_EXTENSIONS.rhFactor),
        ethnicity: getExtension(COLOMBIA_EXTENSIONS.ethnicity),
        disability_status: getExtension(COLOMBIA_EXTENSIONS.disabilityStatus),
        active: fhirPatient.active ?? true,
    };
}

// ─────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────

/**
 * Construye parámetros de búsqueda FHIR desde filtros locales
 */
export function buildFHIRSearchParams(
    filters: Partial<LocalPatient>,
): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.identifier_value && filters.identifier_type) {
        const typeInfo = IDENTIFIER_TYPE_MAP[filters.identifier_type];
        params['identifier'] = typeInfo
            ? `${typeInfo.system}|${filters.identifier_value}`
            : filters.identifier_value;
    }

    if (filters.family_name) {
        params['family'] = filters.family_name;
    }

    if (filters.given_name) {
        params['given'] = filters.given_name;
    }

    if (filters.birth_date) {
        params['birthdate'] = filters.birth_date;
    }

    if (filters.gender) {
        params['gender'] = filters.gender;
    }

    return params;
}

/**
 * Valida los campos requeridos de un paciente local
 */
export function validateLocalPatient(
    patient: Partial<LocalPatient>,
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Campos obligatorios
    if (!patient.identifier_type) errors.push('identifier_type es requerido');
    if (!patient.identifier_value) errors.push('identifier_value es requerido');
    if (!patient.family_name) errors.push('family_name es requerido');
    if (!patient.given_name) errors.push('given_name es requerido');
    if (!patient.birth_date) errors.push('birth_date es requerido');
    if (!patient.gender) errors.push('gender es requerido');

    // Formato de fecha YYYY-MM-DD
    if (patient.birth_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(patient.birth_date)) {
            errors.push('birth_date debe tener formato YYYY-MM-DD');
        }
    }

    // Formato de email
    if (patient.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(patient.email)) {
            errors.push('email no tiene un formato válido');
        }
    }

    // Tipo de identificador válido
    if (patient.identifier_type && !IDENTIFIER_TYPE_MAP[patient.identifier_type]) {
        errors.push(
            `identifier_type '${patient.identifier_type}' no es válido. ` +
            `Use: ${Object.keys(IDENTIFIER_TYPE_MAP).join(', ')}`,
        );
    }

    // Género válido
    const validGenders = ['male', 'female', 'other', 'unknown'];
    if (patient.gender && !validGenders.includes(patient.gender)) {
        errors.push(
            `gender '${patient.gender}' no es válido. ` +
            `Use: ${validGenders.join(', ')}`,
        );
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ─────────────────────────────────────────────
// Respuesta simplificada (para el API local)
// ─────────────────────────────────────────────
export interface SimplePatientResponse {
    id: string;
    identifier_type: string;
    identifier_value: string;
    full_name: string;
    family_name: string;
    given_name: string;
    middle_name?: string;
    birth_date: string;
    gender: string;
    phone?: string;
    email?: string;
    address_line?: string;
    city?: string;
    department?: string;
    country?: string;
    marital_status?: string;
    blood_type?: string;
    rh_factor?: string;
    ethnicity?: string;
    disability_status?: string;
    active: boolean;
    ministry_fhir_id?: string;
    ministry_synced: boolean;
    created_at?: Date;
    updated_at?: Date;
}

// ─────────────────────────────────────────────
// Clase wrapper — compatibilidad con service
// ─────────────────────────────────────────────
export class PatientTranslator {

    /**
     * LOCAL → FHIR R4
     * Alias de localToFHIR para compatibilidad con patient.service.ts
     */
    static toFHIR(data: any): fhir.Patient {
        const patient: LocalPatient = {
            id: data.id,
            identifier_type: data.identifier_type ?? '',
            identifier_value: data.identifier_value ?? '',
            family_name: data.family_name ?? '',
            given_name: data.given_name ?? '',
            middle_name: data.middle_name,
            birth_date: data.birth_date ?? '',
            gender: data.gender ?? 'unknown',
            phone: data.phone,
            email: data.email,
            address_line: data.address ?? data.address_line,
            city: data.city,
            department: data.department,
            country: data.country,
            marital_status: data.marital_status,
            blood_type: data.blood_type,
            rh_factor: data.rh_type ?? data.rh_factor,   // ← compatibilidad BD
            ethnicity: data.ethnicity,
            disability_status: data.disability_status
                ? String(data.disability_status)
                : undefined,
            active: data.active ?? true,
            ministry_id: data.ministry_fhir_id ?? data.ministry_id,
            ministry_synced: data.ministry_synced === true || data.ministry_synced === 'true',
        };

        return localToFHIR(patient);
    }

    /**
     * FHIR R4 → LOCAL
     * Alias de fhirToLocal
     */
    static fromFHIR(fhirPatient: fhir.Patient): Partial<LocalPatient> {
        return fhirToLocal(fhirPatient);
    }

    /**
     * Fila de BD → Respuesta simplificada para el API
     */
    static toSimpleResponse(row: any): SimplePatientResponse {
        return {
            id: row.id,
            identifier_type: row.identifier_type,
            identifier_value: row.identifier_value,
            full_name: [
                row.given_name,
                row.middle_name,
                row.family_name,
            ]
                .filter(Boolean)
                .join(' '),
            family_name: row.family_name,
            given_name: row.given_name,
            middle_name: row.middle_name ?? undefined,
            birth_date: row.birth_date,
            gender: row.gender,
            phone: row.phone ?? undefined,
            email: row.email ?? undefined,
            address_line: row.address ?? undefined,   // ← columna BD = address
            city: row.city ?? undefined,
            department: row.department ?? undefined,
            country: row.country ?? undefined,
            marital_status: row.marital_status ?? undefined,
            blood_type: row.blood_type ?? undefined,
            rh_factor: row.rh_type ?? undefined,   // ← columna BD = rh_type
            ethnicity: row.ethnicity ?? undefined,
            disability_status: row.disability_status
                ? String(row.disability_status)
                : undefined,
            active: row.active ?? true,
            ministry_fhir_id: row.ministry_fhir_id ?? undefined,
            ministry_synced: row.ministry_synced ?? false,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}

