// Pruebas de estructura de los 4 RDA a partir de los ejemplos en /examples
import fs from 'fs';
import path from 'path';
import { RDA_TYPES, RdaTipo, validateAndTranslate, tipoFromBundle, resolveTipo } from '../src/rda/rda.registry';
import { findDanglingReferences } from '../src/translators/rda/common';

const load = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', f), 'utf8'));

const CASES: Array<[RdaTipo, string]> = [
  ['paciente', 'rda-paciente.json'],
  ['consulta', 'rda-consulta.json'],
  ['urgencias', 'rda-urgencias.json'],
  ['hospitalizacion', 'rda-hospitalizacion.json'],
];

/** Recorre el bundle y devuelve rutas donde "coding" no es un array (error FHIR común) */
function codingNotArray(node: unknown, p = '$'): string[] {
  const out: string[] = [];
  if (Array.isArray(node)) node.forEach((n, i) => out.push(...codingNotArray(n, `${p}[${i}]`)));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'coding' && !Array.isArray(v)) out.push(`${p}.${k}`);
      out.push(...codingNotArray(v, `${p}.${k}`));
    }
  }
  return out;
}

describe.each(CASES)('RDA %s', (tipo, file) => {
  const r = validateAndTranslate(tipo, load(file));
  const bundle: any = r.bundle;

  it('valida y traduce sin errores', () => {
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('es un Bundle document con UNA Composition en entry[0]', () => {
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('document');
    expect(bundle.entry[0].resource.resourceType).toBe('Composition');
    expect(bundle.entry.filter((e: any) => e.resource.resourceType === 'Composition')).toHaveLength(1);
  });

  it('usa el perfil de Composition correcto y se enruta a la operación correcta', () => {
    expect(bundle.entry[0].resource.meta.profile).toContain(RDA_TYPES[tipo].compositionProfile);
    expect(tipoFromBundle(bundle)).toBe(tipo);
  });

  it('todas las referencias #id resuelven dentro del bundle', () => {
    expect(findDanglingReferences(bundle)).toEqual([]);
  });

  it('todos los "coding" son arrays', () => {
    expect(codingNotArray(bundle)).toEqual([]);
  });

  it('Composition.event es un array con 2 códigos', () => {
    const ev = bundle.entry[0].resource.event;
    expect(Array.isArray(ev)).toBe(true);
    expect(ev[0].code).toHaveLength(2);
  });

  it('IDs de Patient y Practitioner siguen el patrón TipoDoc-Numero', () => {
    const ids = bundle.entry.map((e: any) => e.resource)
      .filter((x: any) => ['Patient', 'Practitioner'].includes(x.resourceType)).map((x: any) => x.id);
    ids.forEach((id: string) => expect(id).toMatch(/^[A-Z]{2}-\w+$/));
  });

  it('cada sección tiene entries o emptyReason (no ambos)', () => {
    for (const s of bundle.entry[0].resource.section) {
      expect(Boolean(s.entry?.length) !== Boolean(s.emptyReason)).toBe(true);
    }
  });
});

describe('RDA Urgencias – reglas específicas', () => {
  const bundle: any = validateAndTranslate('urgencias', load('rda-urgencias.json')).bundle;
  const enc = bundle.entry.find((e: any) => e.resource.resourceType === 'Encounter').resource;

  it('Encounter class EMER y grupo de servicios 05', () => {
    expect(enc.class.code).toBe('EMER');
    expect(enc.type.map((t: any) => t.coding[0].code)).toContain('05');
  });
  it('diagnósticos ingreso (rank 1) y egreso (rank 2)', () => {
    expect(enc.diagnosis.map((d: any) => [d.id, d.rank])).toEqual([['AdmissionDiagnosis', 1], ['DischargeDiagnosis', 2]]);
  });
  it('incluye sección y Observation de triage', () => {
    const sec = bundle.entry[0].resource.section.find((s: any) => s.code.coding[0].code === '54094-8');
    expect(sec.entry[0].reference).toBe('#Observation-triage');
  });
  it('sin triage → error de validación', () => {
    const input = load('rda-urgencias.json'); delete input.triage;
    const r = validateAndTranslate('urgencias', input);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/triage/);
  });
});

describe('RDA Hospitalización – reglas específicas', () => {
  const bundle: any = validateAndTranslate('hospitalizacion', load('rda-hospitalizacion.json')).bundle;
  const enc = bundle.entry.find((e: any) => e.resource.resourceType === 'Encounter').resource;
  it('Encounter class IMP, grupo 03 y comorbilidad rank 3', () => {
    expect(enc.class.code).toBe('IMP');
    expect(enc.type.map((t: any) => t.coding[0].code)).toContain('03');
    expect(enc.diagnosis.find((d: any) => d.id === 'DischargeComorbidity-1').rank).toBe(3);
  });
  it('sin pagador → error de validación', () => {
    const input = load('rda-hospitalizacion.json'); delete input.payers;
    expect(validateAndTranslate('hospitalizacion', input).ok).toBe(false);
  });
  it('no tiene sección de triage', () => {
    expect(bundle.entry[0].resource.section.some((s: any) => s.code.coding[0].code === '54094-8')).toBe(false);
  });
});

describe('Validación y referencias cruzadas', () => {
  it('reporta TODOS los campos faltantes a la vez', () => {
    const r = validateAndTranslate('consulta', { patient: {}, tenant: {}, practitioner: {} });
    expect(r.errors.length).toBeGreaterThan(5);
  });
  it('detecta un procedure_id inexistente', () => {
    const input = load('rda-urgencias.json');
    input.procedure_results[0].procedure_id = '99';
    const r = validateAndTranslate('urgencias', input);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/#Procedure-99/);
  });
  it('resuelve alias de tipo', () => {
    expect(resolveTipo('ambulatorio')).toBe('consulta');
    expect(resolveTipo('Hospitalización')).toBe('hospitalizacion');
    expect(resolveTipo('xyz')).toBeNull();
  });
  it('operaciones del Manual IHCE', () => {
    expect(RDA_TYPES.paciente.operation).toBe('/Composition/$enviar-rda-paciente');
    expect(RDA_TYPES.consulta.operation).toBe('/Composition/$enviar-rda-consulta');
    expect(RDA_TYPES.urgencias.operation).toBe('/Composition/$enviar-rda-urgencias');
    expect(RDA_TYPES.hospitalizacion.operation).toBe('/Composition/$enviar-rda-hospitalizacion');
  });
});

describe('Patient – campos obligatorios del perfil PatientRDA', () => {
  it.each(['nationality_code', 'ethnicity_code', 'disability_code', 'biological_gender_code'])('sin %s → error', (campo) => {
    const input = load('rda-paciente.json'); delete input.patient[campo];
    const r = validateAndTranslate('paciente', input);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain(campo);
  });
  it.each(CASES)('%s: todas las codings del Patient llevan display', (tipo, file) => {
    const b: any = validateAndTranslate(tipo, load(file)).bundle;
    const pat = b.entry.find((e: any) => e.resource.resourceType === 'Patient').resource;
    const sinDisplay: string[] = [];
    const walk = (n: any, p: string) => {
      if (Array.isArray(n)) n.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (n && typeof n === 'object') {
        if (n.system && n.code && !n.display) sinDisplay.push(`${p} (${n.system})`);
        Object.entries(n).forEach(([k, v]) => walk(v, `${p}.${k}`));
      }
    };
    walk(pat, 'Patient');
    expect(sinDisplay).toEqual([]);
  });
});

describe('Consulta – reglas del Ministerio (sandbox)', () => {
  it('sin document_references → error', () => {
    const i = load('rda-consulta.json'); delete i.document_references;
    expect(validateAndTranslate('consulta', i).errors.join(' ')).toMatch(/document_references/);
  });
  it.each(['reason_code', 'frequency_code', 'frequency_value', 'dose_value', 'dose_unit_code', 'duration_days', 'route_code'])('fórmula sin %s → error', (k) => {
    const i = load('rda-consulta.json'); delete i.medication_requests[0][k];
    expect(validateAndTranslate('consulta', i).errors.join(' ')).toContain(k);
  });
  it('la fórmula lleva reasonCode, timing.code y doseAndRate; el soporte lleva content', () => {
    const b: any = validateAndTranslate('consulta', load('rda-consulta.json')).bundle;
    const mr = b.entry.find((e: any) => e.resource.resourceType === 'MedicationRequest').resource;
    expect(mr.reasonCode).toHaveLength(1);
    expect(mr.dosageInstruction[0].timing.code.coding[0].code).toBeTruthy();
    expect(mr.dosageInstruction[0].doseAndRate).toHaveLength(1);
    const dr = b.entry.find((e: any) => e.resource.resourceType === 'DocumentReference').resource;
    expect(dr.content[0].attachment.data).toBeTruthy();
  });
});

describe('DocumentReferenceEPIRDA – valores fijos del perfil', () => {
  it.each([['consulta', 'rda-consulta.json'], ['urgencias', 'rda-urgencias.json'], ['hospitalizacion', 'rda-hospitalizacion.json']] as Array<[RdaTipo, string]>)('%s', (tipo, file) => {
    const b: any = validateAndTranslate(tipo, load(file)).bundle;
    const dr = b.entry.find((e: any) => e.resource.resourceType === 'DocumentReference').resource;
    expect(dr.custodian.reference).toBe('Organization/MinSalud');
    expect(dr.type.coding.map((c: any) => c.code)).toEqual(['18842-5', 'EPI']);
    expect(dr.description).toBe('Epicrisis del encuentro de atención en salud - RDA');
    expect(dr.content[0].format.code).toBe('application/pdf');
    expect(dr.context.encounter[0].reference).toBe('#Encounter-0');
  });
});

describe('MedicationRequestRDA – slices de doseAndRate', () => {
  it('slice UMM con rate MedicationTime; soporte sin contentType y securityLabel restricted', () => {
    const b: any = validateAndTranslate('consulta', load('rda-consulta.json')).bundle;
    const mr = b.entry.find((e: any) => e.resource.resourceType === 'MedicationRequest').resource;
    const dr0 = mr.dosageInstruction[0].doseAndRate[0];
    expect(dr0.doseQuantity.system).toBe('https://fhir.minsalud.gov.co/rda/CodeSystem/UMM');
    expect(dr0.rateQuantity.system).toBe('https://fhir.minsalud.gov.co/rda/CodeSystem/MedicationTime');
    expect(dr0.rateQuantity.value).toBe(8);
    const doc = b.entry.find((e: any) => e.resource.resourceType === 'DocumentReference').resource;
    expect(doc.content[0].attachment.contentType).toBeUndefined();
    expect(doc.securityLabel[0].coding[0].display).toBe('restricted');
  });
});
