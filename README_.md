# Bridge API FHIR

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat&logo=postgresql&logoColor=white)
![FHIR R4](https://img.shields.io/badge/FHIR-R4-E84B3A?style=flat)
![MinSalud RDA](https://img.shields.io/badge/MinSalud-RDA-003087?style=flat)
![License](https://img.shields.io/badge/Licencia-MIT-yellow?style=flat)

**Bridge API FHIR** es una plataforma de interoperabilidad sanitaria desarrollada por
[Miriada Tech](https://miriadatech.com) que conecta sistemas de Historia Clínica
Electrónica (HCE) con el ecosistema **RDA (Registro de Datos en Salud)** del
Ministerio de Salud y Protección Social de Colombia (**MinSalud**), usando el
estándar **HL7 FHIR R4**.

---

## Tabla de contenidos

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Variables de entorno](#variables-de-entorno)
4. [Endpoints de la API](#endpoints-de-la-api)
5. [Recursos FHIR R4 implementados](#recursos-fhir-r4-implementados)

---

## Descripción general

### ¿Qué problema resuelve?

Los sistemas HCE en Colombia deben reportar datos clínicos al MinSalud en formato
FHIR R4 según la especificación RDA. Este proceso implica:

- Transformar datos clínicos propietarios a Bundles FHIR R4 válidos.
- Cumplir con las extensiones y perfiles colombianos definidos por MinSalud.
- Autenticar el envío mediante OAuth2 contra los servidores del Ministerio.
- Mantener trazabilidad de cada envío en una bitácora de sincronización.

**Bridge API FHIR** abstrae toda esta complejidad en una API REST simple,
multitenant y segura, lista para integrarse con cualquier HCE existente.

### Modelo de negocio

- **B2B** — Diseñada para ser consumida por sistemas de software hospitalario,
  clínicas y operadores de salud.
- **Multitenant** — Cada organización opera con su propia API Key y espacio de datos.
- **Sin interfaz gráfica** — 100% orientada a integración programática.

### Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 18+ / TypeScript 5 |
| Framework | Express.js |
| Base de datos | PostgreSQL 17 |
| ORM | Knex.js |
| Estándar clínico | HL7 FHIR R4 |
| HTTP client | Axios |
| Validación | Zod |

---

## Arquitectura

El sistema está organizado en **5 capas** con responsabilidades bien definidas:

┌─────────────────────────────────────────────────────────────┐ 
│ Cliente HCE │ │ (Hospital / Clínica / ERP) │ 
└─────────────────────────┬───────────────────────────────────┘ 
│ REST + x-api-key 
┌─────────────────────────▼───────────────────────────────────┐ 
│ CAPA 1 — Autenticación y Autorización │ │ │ │ authMiddleware │ 
│ • Valida x-api-key contra tabla tenants (PostgreSQL) │ │ 
  • Modelo API Key-only | Prefijo: baf_ │ │ 
  • Multitenant: cada key pertenece a una organización │ 
└─────────────────────────┬───────────────────────────────────┘ │ 
┌─────────────────────────▼───────────────────────────────────┐ │ 
CAPA 2 — EHR CRUD y Sincronización │ │ │ │ ConsultationController → ConsultationService 
│ │ • Gestión de pacientes, consultas y profesionales │ 
│ • Persistencia en PostgreSQL │ │ RDAService v3.0 │ │  
• Agrega datos clínicos para construcción del Bundle │ │ 
• Gestiona ministry_sync_logs (trazabilidad) │ 
└─────────────────────────┬───────────────────────────────────┘ 
│ ┌─────────────────────────▼───────────────────────────────────┐ 
│ CAPA 3 — Capa de Traducción │ │ │ 
│ RDAPatientStatementTranslator v4.0 │
 │ • Mapea RDAPatientStatementInput → Bundle FHIR R4 │ 
 │ • Implementa perfiles colombianos MinSalud │ 
 │ • Maneja extensiones clínicas (nacionalidad, etnia, etc.) 
 │ └─────────────────────────┬───────────────────────────────────┘ 
 │ ┌─────────────────────────▼───────────────────────────────────┐ 
 │ CAPA 4 — Validación FHIR │ │ │ │ FHIRValidator (src/utils + src/validators) │ 
 │ • Valida estructura del Bundle antes del envío │ 
 │ • Verifica conformidad con perfiles RDA
 │ └─────────────────────────┬───────────────────────────────────┘ 
 │ ┌─────────────────────────▼───────────────────────────────────┐ 
 │ CAPA 5 — Integración MinSalud │ 
 │ 
 │ 
 │ ministryClient (Axios factory + OAuth2) 
 │ 
 │ • Modo sandbox: registra en BD, NO envía a MinSalud 
 │ 
 │ • Modo strict: autentica OAuth2 + envía Bundle real 
 │ └─────────────────────────────────────────────────────────────┘


### Estructura del repositorio
bridge-api-fhir/ ├── src/ │ ├── config/ # Configuración de BD y variables de entorno │ 
├── controllers/ # ConsultationController │ ├── middleware/ # authMiddleware (API Key) │ 
├── routes/ # Definición de rutas Express │ ├── services/ │ │ ├── RDAService.ts # Agregación y sync │ 
│ └── ministryClient.ts # Cliente OAuth2 MinSalud │ ├── translators/ │
 │ └── RDAPatientStatementTranslator.ts # Mapeo FHIR R4 │ ├── utils/ # Helpers FHIR, fechas, identificadores │ └── validators/ # FHIRValidator, schemas Zod ├── .env.example ├── package.json ├── tsconfig.json └── README.md


---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env


# ─── Servidor ─────────────────────────────────────────────────
PORT=3000
NODE_ENV=development          # development | production

# ─── Base de datos (PostgreSQL) ───────────────────────────────
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=SSOperabilidad
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# ─── MinSalud RDA (OAuth2) ────────────────────────────────────
# Credenciales otorgadas por el Ministerio de Salud de Colombia
# Solo necesarias para modo strict (envío real)
MINISTRY_CLIENT_ID=
MINISTRY_CLIENT_SECRET=
MINISTRY_TOKEN_URL=
MINISTRY_SUBMIT_URL=


Endpoints de la API
Autenticación
Todos los endpoints requieren el header:



x-api-key: baf_<64 caracteres hex>
GET /health

Respuesta:
{
  "status": "ok",
  "timestamp": "2026-04-19T15:00:00.000Z"
}

Pacientes
Listar pacientes
GET /api/ehr/patients

bash
curl -s http://localhost:3000/api/ehr/patients \
  -H "x-api-key: baf_<tu-api-key>"
  
Respuesta:
[
  {
    "id": "uuid",
    "document_type": "CC",
    "document_number": "123456789",
    "first_name": "María",
    "last_name": "González",
    "birth_date": "1985-03-15",
    "gender": "female"
  }
]

Consultas
Crear consulta
POST /api/ehr/consultations
Content-Type: application/json
bash
curl -s -X POST http://localhost:3000/api/ehr/consultations \
  -H "x-api-key: baf_<tu-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": {
      "documentType": "CC",
      "documentNumber": "123456789",
      "firstName": "María",
      "lastName": "González",
      "birthDate": "1985-03-15",
      "gender": "female"
    },
    "practitioner": {
      "documentType": "CC",
      "documentNumber": "987654321",
      "name": "Dr. Carlos García",
      "specialty": "Medicina General"
    },
    "consultation": {
      "date": "2026-04-19",
      "reason": "Control de rutina",
      "diagnosis": [
        { "code": "Z00.0", "system": "ICD-10", "display": "Examen médico general" }
      ],
      "medications": [
        { "code": "J01CA04", "display": "Amoxicilina 500mg", "status": "active" }
      ]
    }
  }'

Respuesta 201 Created:
{
  "id": "uuid-de-la-consulta",
  "status": "created",
  "createdAt": "2026-04-19T15:00:00.000Z"
}


Obtener consulta por ID
GET /api/ehr/consultations/:id
bash
curl -s http://localhost:3000/api/ehr/consultations/<id> \
  -H "x-api-key: baf_<tu-api-key>"

RDA — Interoperabilidad MinSalud
Generar Bundle FHIR R4
Genera el documento FHIR R4 sin enviarlo a MinSalud. Útil para inspección y validación previa.

GET /api/ehr/rda/consultations/:id/bundle

bash
curl -s http://localhost:3000/api/ehr/rda/consultations/<id>/bundle \
  -H "x-api-key: baf_<tu-api-key>"

Respuesta: Bundle FHIR R4 completo (tipo document, idioma es-CO).

Sincronizar con MinSalud
POST /api/ehr/rda/consultations/:id/sync
Content-Type: application/json

bash
# Modo sandbox (pruebas)
curl -s -X POST \
  http://localhost:3000/api/ehr/rda/consultations/<id>/sync \
  -H "x-api-key: baf_<tu-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"mode": "sandbox"}'

# Modo strict (producción)
curl -s -X POST \
  http://localhost:3000/api/ehr/rda/consultations/<id>/sync \
  -H "x-api-key: baf_<tu-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"mode": "strict"}'
  
Respuesta
{
  "logId": "uuid-del-log",
  "status": "pending",
  "mode": "sandbox",
  "consultationId": "<id>",
  "syncedAt": "2026-04-19T15:00:00.000Z"
}

Recursos FHIR R4 implementados
Cada Bundle generado contiene los siguientes recursos, conformes con los perfiles RDA de MinSalud Colombia:

Bundles
resourceType	Bundle
type	document
language	es-CO
entry[].fullUrl	Omitido (requerimiento MinSalud)

Composition
Recurso raíz del documento clínico. Referencia todos los demás recursos del Bundle.
{
  "resourceType": "Composition",
  "language": "es-CO",
  "status": "final",
  "type": { "coding": [{ "system": "...", "code": "..." }] },
  "date": "2026-04-19T15:00:00.000Z",
  "title": "Registro de Atención en Salud"
}


Patient
Implementa las extensiones colombianas requeridas por MinSalud:
Extensión	URL
Nacionalidad	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionNationality
Etnia	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionEthnicity
Discapacidad	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionDisability
Identidad de género	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionGenderIdentity
Sexo biológico	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionBiologicalGender
Primer apellido	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionFathersFamilyName
Segundo apellido	https://fhir.minsalud.gov.co/rda/StructureDefinition/ExtensionMothersFamilyName

Practitioner
Manejo inteligente de nombres con filtrado de tratamientos honoríficos:
Entrada	given	family
"Dr. Carlos García"	["Carlos"]	"García"
"Dra. Ana María López Ruiz"	["Ana", "María"]	"López"
"Pedro Martínez Gómez"	["Pedro"]	"Martínez"
Tratamientos filtrados: Dr., Dra., Lic., Mg., PhD., Prof., Esp.

Organization
Propiedad	Descripción
identifier[0]	NIT de la institución
identifier[1]	Código REPS
name	Omitido (requerimiento MinSalud)


Condition
Diagnósticos CIE-10 del encuentro clínico.

NOTA: Las propiedades verificationStatus.coding y clinicalStatus.coding omiten intencionalmente la propiedad system, en cumplimiento con los perfiles RDA de MinSalud Colombia.

MedicationStatement
Medicamentos activos o prescritos durante la consulta, codificados según los catálogos definidos por MinSalud.

Licencia
MIT © 2026 Miriada Tech — https://miriadatech.com


---

### Instrucciones para guardar

**En Windows (PowerShell):**
```powershell
# Navega al directorio del proyecto
cd C:\LARAGON\WWW\BRIDGE-API-FHIR-MASTER

# Abre el archivo con el editor de tu preferencia
notepad README.md
# o con VS Code:
code README.md


  

