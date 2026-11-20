# Bridge API FHIR – Guía de uso (RDA MinSalud)

API multi‑cliente que recibe un **JSON "normal"** desde el HIS de cada IPS, lo **valida**, lo **traduce a un Bundle FHIR RDA** según la Guía de Implementación del Ministerio (Res. 1888 de 2025) y lo **envía al mecanismo IHCE** con las credenciales de cada cliente, mediante un worker con cola y reintentos.

```
HIS ──JSON──▶ POST /api/rda/{tipo} ──▶ validación ──▶ traductor FHIR ──▶ interoperabilidad_recibida (RECIBIDO)
                                                                              │
                         worker (cada N s) ◀──────────────────────────────────┘
                              │  token OAuth del cliente (Azure AD, caché)
                              └─▶ POST {url_base}/Composition/$enviar-rda-{tipo} ──▶ ENVIADO | ERROR | REINTENTANDO
```

## 1. Tipos de RDA soportados

| `tipo` en la URL | RDA | Operación IHCE | Perfil Composition |
|---|---|---|---|
| `paciente` | RDA Paciente (antecedentes) | `/Composition/$enviar-rda-paciente` | CompositionPatientStatementRDA |
| `consulta` | RDA Consulta Externa | `/Composition/$enviar-rda-consulta` | CompositionAmbulatoryRDA |
| `urgencias` | RDA Urgencias / Atención inmediata | `/Composition/$enviar-rda-urgencias` | CompositionEmergencyRDA |
| `hospitalizacion` | RDA Hospitalización / Internación | `/Composition/$enviar-rda-hospitalizacion` | CompositionHospitalizationRDA |

También se aceptan alias: `ambulatorio`, `consulta-externa`, `urgencia`, `internacion`, etc.

## 2. Instalación

```bash
npm install
cp .env.example .env          # completar DB_*, ADMIN_API_KEY, WORKER_*
psql -h HOST -U USER -d DB -f database/migrations/002_interoperabilidad_rda.sql
npm run build

npm start                     # API (puerto PORT, por defecto 3000)
npm run worker:start          # Worker de envío (proceso separado)

# Producción con pm2
pm2 start dist/server.js --name fhir-api
pm2 start dist/workers/ministerioSender.worker.js --name fhir-worker
pm2 save
```

Desarrollo: `npm run dev` y `npm run worker:dev`. Pruebas: `npm test`.

> La migración 002 es idempotente (se puede correr sobre la base actual). Crea el índice único `(ips_id, uuid_evento)`: si ya existen filas duplicadas con el mismo `uuid_evento` para la misma IPS, depúrelas antes.

## 3. Alta de un cliente (IPS)

**3.1 Registrar** (si `ADMIN_API_KEY` está definido, requiere el header `x-admin-key`):

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"name":"IPS Ejemplo SAS","email":"ti@ips.co","nit":"900123456","institution_code":"4443000277"}'
```

La respuesta trae `api_key` (`baf_…`). **Se muestra una sola vez.**
`institution_code` (código de habilitación REPS) queda en `clientes.codigo_habilitacion` y se usa como Organization/custodian de todos los RDA del cliente, ignorando lo que venga en el body. Esto evita el rechazo *"El recurso referenciado en Custodian.reference no corresponde con el usuario con el que se está enviando el token"*.

**3.2 Credenciales del Ministerio** (las entrega MinSalud – Manual de gestión de credenciales IHCE):

```bash
curl -X PUT http://localhost:3000/api/auth/ministry-credentials \
  -H "x-api-key: baf_..." -H "Content-Type: application/json" \
  -d '{
    "client_id": "…", "client_secret": "…",
    "tenant_id": "…",                       
    "scope": "…",
    "api_url": "https://sandbox.ihcecol.gov.co/ihce",
    "subscription_key": "…",
    "mode": "sandbox"
  }'
```

`mode`: `sandbox` | `strict` | `disabled` (disabled = el worker no envía). `GET /api/auth/profile` muestra la configuración sin exponer secretos.

## 4. Endpoints

Todos (excepto `/health` y `register`) requieren `x-api-key: baf_…`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| POST | `/api/auth/register` | Alta de cliente (x-admin-key) |
| GET | `/api/auth/profile` | Datos del cliente |
| PUT | `/api/auth/ministry-credentials` | Guardar credenciales IHCE |
| POST | `/api/auth/regenerate-key` | Nueva API key (la anterior queda inválida) |
| GET | `/api/rda/tipos` | Tipos de RDA soportados y sus operaciones |
| **POST** | **`/api/rda/{tipo}/translate`** | Valida y devuelve el Bundle FHIR. **No guarda ni envía** (para pruebas). `?solo_bundle=true` devuelve solo el Bundle |
| **POST** | **`/api/rda/{tipo}`** | Valida, traduce y **encola para envío**. 202. `?incluir_bundle=true` incluye el Bundle |
| GET | `/api/rda/envios` | Lista envíos. Filtros: `estado`, `tipo`, `desde`, `hasta`, `historia_id`, `page`, `page_size` |
| GET | `/api/rda/envios/resumen` | Conteo por tipo y estado |
| GET | `/api/rda/envios/{id}` | Estado y respuesta del Ministerio. `{id}` = id numérico o `uuid_evento`. `?incluir_payload=true` agrega JSON original y Bundle |
| PUT | `/api/rda/envios/{id}` | Reemplaza el JSON de un envío **no enviado** (corrección) y lo re‑encola |
| POST | `/api/rda/envios/{id}/reintentar` | Re‑encola un envío en ERROR (reinicia intentos) |
| POST | `/api/ehr/rda/translate` | *Legado* = `/api/rda/paciente` (responde el Bundle) |
| POST | `/api/ehr/rda/ambulatory/translate` | *Legado* = `/api/rda/consulta` (responde el Bundle) |

### Respuestas

```jsonc
// 202 – encolado
{ "success": true, "tipo": "urgencias", "operacion": "/Composition/$enviar-rda-urgencias",
  "envio": { "id": "3", "uuid_evento": "URG-2026-000123", "estado": "RECIBIDO" },
  "advertencias": ["tenant.institution_code (…) no coincide …"] }

// 200 – mismo uuid_evento ya recibido (idempotencia: no se duplica)
{ "success": true, "duplicado": true, "envio": { … } }

// 422 – JSON inválido: se devuelven TODOS los errores a la vez
{ "success": false, "tipo": "hospitalizacion",
  "errores": ["patient.birth_date is required", "encounter.period_end is required", "payers es obligatorio en hospitalización …"] }
```

### Estados de un envío

| Estado | Significado |
|---|---|
| `RECIBIDO` | En cola, pendiente del worker |
| `ENVIANDO` | El worker lo está enviando (si queda >5 min, se recupera solo) |
| `ENVIADO` | Aceptado por el Ministerio; `ministerio_id` y `respuesta_ministerio` guardados |
| `REINTENTANDO` | Falla temporal (timeout, 5xx, 401); se reintenta hasta `WORKER_MAX_INTENTOS` |
| `ERROR` | Rechazo de contenido (400/409/422) o se agotaron los intentos. Ver `ultimo_error` (incluye todos los issues del OperationOutcome). Corregir con `PUT` o reintentar con `POST …/reintentar` |

## 5. Estructura del JSON de entrada

Ejemplos completos y probados en `examples/`:
`rda-paciente.json`, `rda-consulta.json`, `rda-urgencias.json`, `rda-hospitalizacion.json`.

### 5.1 Campos comunes (todos los tipos)

| Campo | Oblig. | Descripción |
|---|---|---|
| `uuid_evento` | recomendado | Id único del evento en el HIS. Garantiza que un reenvío no duplique el RDA. Si falta, se genera uno |
| `historia_id` | no | Id de la historia en el HIS (para búsquedas) |
| `patient.identifier_type` | sí | CC, TI, CE, PA, RC, MS, AS, CN, PE, PT, CD, SC, DE, NU, SI |
| `patient.identifier_value` | sí | Número de documento |
| `patient.given_name` / `middle_name` | sí / no | Nombres |
| `patient.father_family_name` / `mother_family_name` | sí* | Primer y segundo apellido (*o `family_name`) |
| `patient.gender` | sí | male/female/other/unknown (acepta M/F) |
| `patient.birth_date` | sí | YYYY-MM-DD |
| `patient.divipola_code`, `address_city`, `residence_zone_code`, `nationality_code`, `ethnicity_code`, `disability_code`, `biological_gender_code`… | no | Datos demográficos (códigos de los catálogos MinSalud) |
| `tenant.institution_code` | sí* | Código de habilitación. *Si el cliente lo tiene registrado, se toma de BD |
| `tenant.sede_code` | no | Número de sede (Location = `#{codigo}-{sede}`), por defecto `01` |
| `practitioner.doctor_name` | sí | Nombre completo (se descompone en nombres/apellidos) |
| `practitioner.doctor_identifier_type` | no | Por defecto CC |
| `practitioner.doctor_license` | sí | **Número de documento** del profesional (ID `CC-123…`) |

### 5.2 RDA Paciente
`conditions[]` (`id`, `condition_code` CIE‑10, `condition_display`, `clinical_status`), `allergies[]` (`id`, `allergen`, `allergen_type_code`, `allergen_type`, `status`), `familyHistory[]` (`relationship_code/display`, `condition_code/display`), `medications[]` (`generic_name`, `medication_code` MipresINN), `eventStart`, `eventEnd`, `techModalityCode`, `serviceGroupCode`.

### 5.3 RDA Consulta Externa
`encounter` (`encounter_id`, `period_start`, `period_end`, `tech_modality_code`, `service_group_code`, `reps_service_code`, `care_setting_code`, `cups_service_code`, `external_cause_code`, `discharge_disposition_code`), `payment_source` (`id` = código EAPB, `name`), `conditions[]` (+ `diagnosis_type_code`, `diagnosis_role_code`, `rank`), `allergies[]`, `risk_factors[]`, `medication_requests[]`, `service_requests[]`, `incapacidad`, `ocupacion`, `document_references[]`.

### 5.4 RDA Urgencias y Hospitalización (nuevos)

| Campo | Urg. | Hosp. | Descripción |
|---|---|---|---|
| `encounter.encounter_id` | sí | sí | Id del encuentro en el HIS |
| `encounter.period_start` / `period_end` | sí | sí | Ingreso / egreso. Fecha completa, no futura, máx. 1 año de antigüedad |
| `encounter.tech_modality_code` | sí | sí | ColombianTechModality |
| `encounter.care_setting_code` | fijo 05 | sí | EntornoAtencion |
| `encounter.external_cause_code` | sí | sí | RIPSCausaExternaVersion2 |
| `encounter.admit_source_code` | no | no | ViaIngreso |
| `encounter.discharge_disposition_code` | no | no | CondicionyDestinoUsuarioEgreso |
| `encounter.discharge_destination_code` | no | no | Código de habilitación de la IPS a la que se remite |
| `encounter.discharge_deceased_status_code` | no | no | Vivo/Muerto al egreso |
| `encounter.mipres_ambito_code` | no | no | MipresAmbitosAtencion |
| `triage` (`code` 01‑05, `datetime`) | **sí** | – | Clasificación de triage |
| `payers[]` (`eapb_code`, `name`) o `{ "private": true }` | no | **sí** | Pagador(es) |
| `diagnoses[]` | sí (mín. 2) | sí (mín. 2) | `id`, `role`, `condition_code`, `condition_display`, `diagnosis_type_code`. `role`: `ingreso` (oblig.), `egreso` (oblig.), `comorbilidad` (máx. 3), `causa_muerte`, `complicacion` |
| `medication_admin_requests[]` | no | no | Órdenes de administración durante la atención |
| `medication_administrations[]` | no | no | Medicamentos administrados (`effective_start`, `request_id` → orden) |
| `medication_requests[]` | no | no | Fórmula de egreso |
| `procedures[]` | no | no | `cups_code`, `cups_display`, `performed_datetime`, `reason_code`, `main_condition_id`, `related_condition_id` |
| `procedure_results[]` | no | no | `procedure_id`, `cups_code`, `effective_datetime`, `components[]` (`name`, `value_string` o `value_quantity`+`unit`) |
| `service_requests[]`, `allergies[]`, `risk_factors[]`, `incapacidad`, `ocupacion`, `document_references[]` | no | no | Igual que en consulta. `document_references[].pdf_base64` adjunta la epicrisis |
| `rda_paciente_id` | no | no | Id del RDA Paciente que complementa (Composition.relatesTo) |

**Referencias cruzadas:** los `id` que usted asigna se usan para enlazar recursos (`reason_condition_id`, `main_condition_id`, `procedure_id`, `request_id`). Si una referencia no existe, la API responde 422 indicando cuál.

## 6. Errores frecuentes del Ministerio (tomados de sus logs) y solución

| Mensaje IHCE | Causa | Solución |
|---|---|---|
| *Custodian.reference no corresponde con el usuario del token* | El código de habilitación del RDA no es el de la IPS dueña de las credenciales | Registrar `codigo_habilitacion` del cliente (ya lo hace `register`, o `UPDATE clientes`) |
| *has incorrect display '…', should be '…'* | Display distinto al catálogo oficial | Enviar el display oficial o activar `TERMINOLOGY_AUTOFIX=true` |
| *ID debe ser TipoIdentificación‑NúmeroIdentificación* | Faltaba el documento del médico (antes se generaba un UUID) | `practitioner.doctor_license` ahora es obligatorio |
| *No se encuentra a dicho paciente con RC‑… en Evol* | El paciente no existe en el índice nacional | Enviar primero el RDA Paciente o validar con `$consultar-paciente-exacto` |
| *Composition.event.code … cardinality* | Faltaba `event.code` | Corregido: se envían grupo de servicio + modalidad |
| *Code '0' … MipresINN does not exist* | Medicamento sin código se enviaba con código "0" | Corregido: sin código se envía solo texto |
| *start <= now() / end <= now()* | Fechas futuras o fin antes de inicio | Revisar `period_start/period_end` |
| *Literal 'active' is not a valid value for FamilyHistoryStatus* | Estado inválido | Corregido (`partial`) |

## 7. Variables de entorno

Ver `.env.example`. Las más importantes: `DB_*`, `ADMIN_API_KEY`, `WORKER_INTERVAL_SECONDS`, `WORKER_MAX_INTENTOS`, `WORKER_MAX_BATCH`, `WORKER_HTTP_TIMEOUT_MS`, `TERMINOLOGY_AUTOFIX`, `TERMINOLOGY_CACHE_HOURS`, `TERMINOLOGY_ICD10_ID` (id del CodeSystem CIE‑10 en IHCE, si se quiere autocorregir CIE‑10).

## 8. Antes de producción

1. Probar cada tipo en **sandbox** (`mode: sandbox`) con datos reales de un paciente existente.
2. Verificar con los catálogos oficiales (`GET /CodeSystem/{id}` del IHCE) los códigos de ViaIngreso, CondicionyDestinoUsuarioEgreso, ColombianDischargeDeceasedStatus y CausaExterna que use su HIS.
3. Los perfiles de **MedicationAdministrationRDA** y **ProcedureResultRDA** se implementaron con los elementos publicados en la guía; si el sandbox reporta elementos adicionales obligatorios, se ajustan en `src/translators/rda/common.ts`.
