// src/rda/rda.schemas.ts
// Validación del "JSON normal" de entrada para cada tipo de RDA.
// Se devuelven TODOS los errores a la vez (abortEarly: false) para que el HIS
// pueda corregir el mensaje en un solo intento.

import Joi from 'joi';

const isoDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('debe tener formato YYYY-MM-DD');
// Fecha-hora con al menos YYYY-MM-DDTHH:mm (el Ministerio exige fecha completa en los periodos)
const isoDateTime = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/).message('debe ser fecha-hora ISO-8601, ej. 2026-11-20T08:30:00-05:00');
const code = Joi.string().trim().min(1);
const id = Joi.alternatives(Joi.string().trim().min(1), Joi.number()).required();

const ID_TYPES = ['CC', 'TI', 'CE', 'PA', 'RC', 'MS', 'AS', 'CN', 'PE', 'PT', 'CD', 'SC', 'DE', 'NU', 'SI'];

export const patientSchema = Joi.object({
    identifier_type: Joi.string().uppercase().valid(...ID_TYPES).required(),
    identifier_value: code.required(),
    given_name: code.required(),
    middle_name: Joi.string().allow('', null),
    family_name: Joi.string().allow('', null),
    father_family_name: Joi.string().allow('', null),
    mother_family_name: Joi.string().allow('', null),
    gender: code.required(),
    birth_date: isoDate.required(),
    birth_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null),
    // Obligatorios en el perfil PatientRDA (el Ministerio rechaza sin ellos)
    nationality_code: code.required().messages({ 'any.required': 'patient.nationality_code es obligatorio (ISO 3166-1 numérico, Colombia = 170)' }),
    ethnicity_code: code.required().messages({ 'any.required': 'patient.ethnicity_code es obligatorio (CodeSystem ColombianEthnicGroup, ej. 6 = Otras etnias)' }),
    disability_code: code.required().messages({ 'any.required': 'patient.disability_code es obligatorio (CodeSystem ColombianDisabilityClassification; consulte GET /api/rda/catalogos/ColombianDisabilityClassification)' }),
    biological_gender_code: code.required().messages({ 'any.required': 'patient.biological_gender_code es obligatorio (sexo biológico, CodeSystem ColombianGenderGroup; consulte GET /api/rda/catalogos/ColombianGenderGroup)' }),
    residence_zone_code: Joi.string().valid('01', '02').messages({ 'any.only': 'patient.residence_zone_code debe ser 01 (Urbana) o 02 (Rural)' }),
}).or('father_family_name', 'family_name').unknown(true);

export const tenantSchema = Joi.object({
    institution_code: code.required(),
    nit: Joi.string().allow('', null),
    name: Joi.string().allow('', null),
    sede_code: Joi.string().allow(null),
}).unknown(true);

export const practitionerSchema = Joi.object({
    doctor_name: code.required(),
    doctor_identifier_type: Joi.string().uppercase().valid(...ID_TYPES),
    doctor_license: code.required(),
}).unknown(true);

const conditionBase = {
    id,
    condition_code: Joi.string().allow(null),
    condition_display: code.required(),
};

// Orden de administración intrahospitalaria (MedicationAdminRequestRDA)
const medicationRequest = Joi.object({
    id,
    medication_display: code.required(),
    medication_system: Joi.string().valid('MipresINN', 'IUMPrimerNivel'),
}).unknown(true);

// Fórmula médica (MedicationRequestRDA): el Ministerio exige finalidad, frecuencia y dosis
const prescription = medicationRequest.keys({
    reason_code: code.required().messages({ 'any.required': 'medication_requests[].reason_code es obligatorio (finalidad, CodeSystem RIPSFinalidadConsultaVersion2)' }),
    frequency_code: code.required().messages({ 'any.required': 'medication_requests[].frequency_code es obligatorio (unidad de la frecuencia, CodeSystem MedicationTime, ej. 2 = Horas)' }),
    frequency_value: Joi.number().positive().required().messages({ 'any.required': 'medication_requests[].frequency_value es obligatorio (cada cuánto: ej. 8 con frequency_code 2 = cada 8 horas)' }),
    dose_value: Joi.number().positive().required().messages({ 'any.required': 'medication_requests[].dose_value es obligatorio (cantidad por dosis, ej. 500)' }),
    dose_unit_code: code.required().messages({ 'any.required': 'medication_requests[].dose_unit_code es obligatorio (unidad de medida, CodeSystem UMM; consulte GET /api/rda/catalogos/UMM)' }),
    duration_days: Joi.number().positive().required().messages({ 'any.required': 'medication_requests[].duration_days es obligatorio (duración del tratamiento en días)' }),
    route_code: code.required().messages({ 'any.required': 'medication_requests[].route_code es obligatorio (vía de administración, CodeSystem VAD)' }),
});

// Documento de soporte (la sección "Documentos de soporte" no admite emptyReason)
const documentReferences = Joi.array().min(1).items(Joi.object({
    id,
    pdf_base64: Joi.string(),
    url: Joi.string().uri(),
}).or('pdf_base64', 'url').messages({ 'object.missing': 'document_references[] debe traer pdf_base64 o url' }).unknown(true)).required()
    .messages({
        'any.required': 'document_references es obligatorio: al menos un documento de soporte (PDF de la atención) con pdf_base64 o url',
        'array.min': 'document_references debe tener al menos un documento de soporte',
    });

// ─── RDA Paciente ────────────────────────────────────────────────────────────
export const pacienteSchema = Joi.object({
    patient: patientSchema.required(),
    tenant: tenantSchema.required(),
    practitioner: practitionerSchema.required(),
    conditions: Joi.array().items(Joi.object({ ...conditionBase, clinical_status: Joi.string() }).unknown(true)),
    allergies: Joi.array().items(Joi.object({ id, allergen: code.required() }).unknown(true)),
    familyHistory: Joi.array().items(Joi.object({
        id, relationship_code: code.required(), relationship_display: code.required(),
        condition_code: code.required(), condition_display: code.required(),
    }).unknown(true)),
    medications: Joi.array().items(Joi.object({ id, generic_name: code.required() }).unknown(true)),
}).unknown(true);

// ─── RDA Consulta Externa ────────────────────────────────────────────────────
export const consultaSchema = Joi.object({
    patient: patientSchema.required(),
    tenant: tenantSchema.required(),
    practitioner: practitionerSchema.required(),
    encounter: Joi.object({
        encounter_id: code.required(),
        period_start: isoDateTime.required(),
        period_end: isoDateTime,
    }).unknown(true).required(),
    conditions: Joi.array().items(Joi.object(conditionBase).unknown(true)),
    medication_requests: Joi.array().items(prescription),
    document_references: documentReferences,
}).unknown(true);

// ─── RDA Urgencias / Hospitalización ─────────────────────────────────────────
const diagnosis = Joi.object({
    ...conditionBase,
    role: Joi.string().valid('ingreso', 'egreso', 'comorbilidad', 'causa_muerte', 'complicacion').required(),
    diagnosis_type_code: Joi.string(),
}).unknown(true);

function encounterRdaSchema(kind: 'urgencias' | 'hospitalizacion') {
    return Joi.object({
        patient: patientSchema.required(),
        tenant: tenantSchema.required(),
        practitioner: practitionerSchema.required(),
        encounter: Joi.object({
            encounter_id: code.required(),
            period_start: isoDateTime.required(),
            period_end: isoDateTime.required(),
            tech_modality_code: code.required(),
            external_cause_code: code.required(),
            care_setting_code: kind === 'hospitalizacion' ? code.required() : Joi.any(),
        }).unknown(true).required(),
        payers: kind === 'hospitalizacion'
            ? Joi.array().min(1).items(Joi.object({ eapb_code: Joi.string(), private: Joi.boolean() }).or('eapb_code', 'private').unknown(true)).required()
                .messages({ 'any.required': 'payers es obligatorio en hospitalización (EAPB o pago particular)' })
            : Joi.array().items(Joi.object({ eapb_code: Joi.string(), private: Joi.boolean() }).or('eapb_code', 'private').unknown(true)),
        diagnoses: Joi.array().min(2).items(diagnosis).required()
            .custom((value: Array<{ role: string }>, helpers) => {
                const roles = value.map(d => d.role);
                if (!roles.includes('ingreso')) return helpers.message({ custom: 'diagnoses debe incluir un diagnóstico con role "ingreso"' });
                if (!roles.includes('egreso')) return helpers.message({ custom: 'diagnoses debe incluir un diagnóstico con role "egreso"' });
                return value;
            }),
        triage: kind === 'urgencias'
            ? Joi.object({
                code: Joi.string().valid('01', '02', '03', '04', '05').required(),
                datetime: isoDateTime.required(),
            }).unknown(true).required()
            : Joi.any(),
        medication_admin_requests: Joi.array().items(medicationRequest),
        medication_requests: Joi.array().items(prescription),
        document_references: documentReferences,
        medication_administrations: Joi.array().items(Joi.object({
            id, medication_display: code.required(), effective_start: isoDateTime.required(),
        }).unknown(true)),
        procedures: Joi.array().items(Joi.object({
            id, cups_code: code.required(), cups_display: code.required(), performed_datetime: isoDateTime.required(),
        }).unknown(true)),
        procedure_results: Joi.array().items(Joi.object({
            id, cups_code: code.required(), cups_display: code.required(),
            effective_datetime: isoDateTime.required(), procedure_id: id,
            components: Joi.array().min(1).items(Joi.object({ name: code.required() }).unknown(true)).required(),
        }).unknown(true)),
    }).unknown(true);
}

export const urgenciasSchema = encounterRdaSchema('urgencias');
export const hospitalizacionSchema = encounterRdaSchema('hospitalizacion');

export function validate(schema: Joi.ObjectSchema, payload: unknown): string[] {
    const { error } = schema.validate(payload, { abortEarly: false, convert: true });
    if (!error) return [];
    return error.details.map(d => d.message.replace(/"/g, ''));
}
