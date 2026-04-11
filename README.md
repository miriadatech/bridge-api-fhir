# 🏥 Bridge API FHIR v2.0.0

## Descripción

Bridge API es un middleware de interoperabilidad para historias clínicas electrónicas basado en el estándar **FHIR R4** (Fast Healthcare Interoperability Resources). Desarrollado para MinSalud Colombia.

### Características principales

✅ **FHIR R4 Compliant** - Soporte total para recursos FHIR  
✅ **OAuth 2.0 + JWT** - Autenticación y autorización seguras  
✅ **PostgreSQL + Redis** - Base de datos relacional + caché  
✅ **Rate Limiting** - Control de acceso API  
✅ **Audit Logging** - Registro completo de operaciones  
✅ **Analytics** - Métricas y reportes  
✅ **Docker Ready** - Despliegue con Docker Compose  

## Requisitos previos

- **Node.js** 18+
- **Docker** y **Docker Compose** (opcional)
- **PostgreSQL** 15 (si no usas Docker)
- **Redis** 7 (si no usas Docker)

## Instalación rápida

### 1. Clonar y preparar

\\\ash
git clone <repo>
cd bridge-api-fhir
cp .env.example .env
\\\

### 2. Con Docker (recomendado)

\\\ash
docker-compose up -d
\\\

### 3. Sin Docker

\\\ash
npm install
npm run migrate
npm run seed
npm run build
npm start
\\\

## Uso

### Login

\\\ash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
\\\

### Obtener token

Respuesta:
\\\json
{
  "user": { "id": "...", "email": "..." },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
\\\

### Buscar pacientes

\\\ash
curl -X GET 'http://localhost:3000/api/fhir/Patient?name=Juan&gender=male' \
  -H "Authorization: Bearer YOUR_TOKEN"
\\\

## Estructura del proyecto

\\\
bridge-api-fhir/
├── src/
│   ├── app.ts              # Aplicación principal
│   ├── config/             # Configuraciones
│   ├── middleware/         # Middlewares Express
│   ├── models/             # Definiciones de tipos
│   ├── services/           # Lógica de negocio
│   ├── controllers/        # Controladores
│   ├── routes/             # Rutas API
│   └── utils/              # Utilidades
├── database/
│   ├── migrations/         # Migraciones SQL
│   └── seeds/              # Datos iniciales
├── docker/                 # Configuración Docker
├── tests/                  # Tests
├── docker-compose.yml      # Composición Docker
├── Dockerfile              # Imagen Docker
├── package.json            # Dependencias
└── tsconfig.json           # Configuración TypeScript
\\\

## Endpoints API

### Autenticación
- \POST /api/auth/register\ - Registrar usuario
- \POST /api/auth/login\ - Login
- \POST /api/auth/logout\ - Logout

### Pacientes (FHIR)
- \GET /api/fhir/Patient\ - Listar pacientes
- \POST /api/fhir/Patient\ - Crear paciente
- \GET /api/fhir/Patient/:id\ - Obtener paciente
- \PUT /api/fhir/Patient/:id\ - Actualizar paciente
- \DELETE /api/fhir/Patient/:id\ - Eliminar paciente

### Encuentros (FHIR)
- \GET /api/fhir/Encounter\ - Listar encuentros
- \POST /api/fhir/Encounter\ - Crear encuentro
- \GET /api/fhir/Encounter/:id\ - Obtener encuentro

### Analytics
- \GET /api/analytics/metrics\ - Métricas generales
- \GET /api/analytics/patients\ - Estadísticas de pacientes

## Variables de entorno

Ver \.env.example\ para la lista completa.

## Desarrollo

\\\ash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar tests
npm test

# Linting
npm run lint

# Formatear código
npm run format
\\\

## Testing

\\\ash
npm test                 # Ejecutar tests una vez
npm run test:watch      # Modo watch
\\\

## Seguridad

- ✅ HTTPS/TLS 1.3
- ✅ Helmet.js para headers seguros
- ✅ JWT con expiración
- ✅ Bcrypt para contraseñas
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ SQL injection prevention (prepared statements)
- ✅ Audit logging completo

## Deployment

### Heroku
\\\ash
heroku create bridge-api-fhir
git push heroku main
\\\

### AWS ECS
Usar \Dockerfile\ con ECR

### Kubernetes
Agregar manifiestos k8s en carpeta \k8s/\

## Documentación API

La documentación completa está en \/api/metadata\ (CapabilityStatement FHIR)

## Licencia

Apache 2.0

## Soporte

Para reportar bugs: create un issue en GitHub

---

**Desarrollado con ❤️ para MinSalud Colombia**
