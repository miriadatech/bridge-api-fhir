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

const medicationRequest = Joi.object({
    id,
    medication_display: code.required(),
    medication_system: Joi.string().valid('MipresINN', 'IUMPrimerNivel'),
}).unknown(true);

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
    medication_requests: Joi.array().items(medicationRequest),
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
        medication_requests: Joi.array().items(medicationRequest),
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
