# Bridge API FHIR – RDA MinSalud Colombia

Middleware multi‑cliente para la **Interoperabilidad de la Historia Clínica Electrónica (IHCE)**: recibe un JSON plano desde el HIS de cada IPS, lo traduce al **Resumen Digital de Atención (RDA)** en HL7 FHIR R4 según la guía oficial de MinSalud (Res. 1888 de 2025) y lo envía al Ministerio con las credenciales OAuth de cada cliente.

**RDA soportados:** Paciente · Consulta Externa · Urgencias · Hospitalización

```bash
npm install && cp .env.example .env
psql -f database/migrations/002_interoperabilidad_rda.sql
npm run build && npm start          # API
npm run worker:start                # worker de envío
npm test                            # pruebas de los traductores
```

Uso rápido:

```bash
# Ver el Bundle FHIR sin guardar
curl -X POST localhost:3000/api/rda/urgencias/translate -H "x-api-key: baf_..." \
     -H "Content-Type: application/json" -d @examples/rda-urgencias.json

# Encolar para envío al Ministerio
curl -X POST localhost:3000/api/rda/urgencias -H "x-api-key: baf_..." \
     -H "Content-Type: application/json" -d @examples/rda-urgencias.json

# Consultar estado
curl localhost:3000/api/rda/envios/URG-2026-000123 -H "x-api-key: baf_..."
```

📘 **Guía completa:** [`docs/GUIA_USO.md`](docs/GUIA_USO.md) · 🧪 Ejemplos: [`examples/`](examples) · 📮 Postman: [`docs/postman_collection.json`](docs/postman_collection.json) · 📝 Cambios: [`CHANGELOG.md`](CHANGELOG.md)

## Estructura relevante

```
src/
├── rda/                     registro de tipos RDA + validación (Joi)
├── translators/
│   ├── rda/common.ts        constantes, catálogos y constructores FHIR compartidos
│   ├── rda/RDAEncounterTranslator.ts   RDA Urgencias y Hospitalización
│   ├── RDAAmbulatoryTranslator.ts      RDA Consulta Externa
│   └── RDAPatientStatementTranslator.ts RDA Paciente
├── services/RdaQueueService.ts   cola interoperabilidad_recibida
├── services/FhirSenderService.ts envío por operación ($enviar-rda-*)
├── services/TerminologyService.ts autocorrección de displays (opcional)
├── workers/ministerioSender.worker.ts
└── routes/rdaUnified.routes.ts   /api/rda/*
```
