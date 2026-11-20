# Cambios – v2.1.0 (2026-11-20)

## Nuevo
- **RDA Urgencias** (`CompositionEmergencyRDA`, `EncounterEmergencyRDA`, `ObservationTriageRDA`) y **RDA Hospitalización** (`CompositionHospitalizationRDA`, `EncounterHospitalizationRDA`), con procedimientos (`ProcedureRDA`), resultados (`ProcedureResultRDA`), órdenes de administración (`MedicationAdminRequestRDA`), medicamentos administrados (`MedicationAdministrationRDA`), pagadores EAPB y diagnósticos por rol/rank.
- Endpoints unificados `/api/rda/{tipo}` (paciente | consulta | urgencias | hospitalizacion): preview, encolar, listar, resumen, consultar, corregir y reintentar envíos.
- Validación completa con Joi: devuelve todos los errores a la vez (422) y detecta referencias cruzadas rotas.
- Idempotencia por `uuid_evento` (índice único `ips_id + uuid_evento`).
- Autocorrección de displays con los CodeSystem oficiales (`TERMINOLOGY_AUTOFIX`).
- Migración `002_interoperabilidad_rda.sql` (tablas `clientes` e `interoperabilidad_recibida`), `.env.example`, ejemplos, pruebas Jest y colección Postman.

## Corregido
- **El worker enviaba todos los RDA a `$enviar-rda-paciente`**; ahora usa la operación del tipo (`tipo_evento` o perfil de la Composition).
- Errores 400/409/422 del Ministerio ya no consumen los 5 reintentos: pasan a ERROR con **todos** los issues del OperationOutcome.
- `ips_id` se tomaba del body (`tenant.id`): ahora siempre del cliente autenticado por `x-api-key`.
- El código de habilitación registrado del cliente prevalece sobre el del body (error *Custodian.reference no corresponde…*).
- `register`/`ministry-credentials` escribían en la tabla `tenants`, pero la autenticación y el worker leen `clientes`. Ahora todo usa `clientes`; las credenciales incluyen `tenant_id`, URL base y subscription key.
- RDA Consulta: `coding` como objeto en `Encounter.type`/`serviceType` (debe ser array); `Composition.event` no era array y no tenía `event.code`; custodian del DocumentReference apuntaba a `Organization/MinSalud`; medicamento sin código se enviaba con código `"0"`.
- RDA Paciente: displays de grupo de servicio y modalidad invertidos en `event.code`; si faltaba el documento del médico se generaba un ID con UUID (rechazado por el Ministerio).
- OAuth: `grant_type` en minúsculas (`client_credentials`) según el manual; se eliminaron los `console.log` que imprimían el token y el client_secret.
- Contraseñas de base de datos hardcodeadas en `database.ts`, `db/index.ts` y `workerConfig.ts`; el servidor no cargaba el `.env`; existían dos pools hacia bases distintas.
- `POST /api/auth/register` era público: ahora exige `x-admin-key` si se define `ADMIN_API_KEY`.
