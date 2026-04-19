// src/server.ts
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀  Bridge API FHIR — Servidor iniciado`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📡  URL:  http://localhost:${PORT}`);
    console.log(`🌍  ENV:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥  MinSalud mode: ${process.env.MINISTRY_MODE || 'sandbox'}`);

    console.log(`\n📋  ENDPOINTS DISPONIBLES:`);

    console.log(`\n  🔓  PÚBLICOS (sin autenticación):`);
    console.log(`     GET  /health`);
    console.log(`     POST /api/auth/register`);

    console.log(`\n  🔑  AUTENTICADOS (requiere: x-api-key: baf_...):`);

    console.log(`\n     Auth:`);
    console.log(`     POST  /api/auth/regenerate-key`);
    console.log(`     PUT   /api/auth/ministry-credentials`);
    console.log(`     GET   /api/auth/profile`);

    console.log(`\n     Pacientes:`);
    console.log(`     GET   /api/ehr/patients`);
    console.log(`     POST  /api/ehr/patients`);
    console.log(`     GET   /api/ehr/patients/identifier/:type/:value`);
    console.log(`     GET   /api/ehr/patients/:id`);
    console.log(`     PUT   /api/ehr/patients/:id`);
    console.log(`     DELETE /api/ehr/patients/:id`);
    console.log(`     POST  /api/ehr/patients/:id/sync`);

    console.log(`\n     Consultas:`);
    console.log(`     POST  /api/ehr/consultations`);
    console.log(`     GET   /api/ehr/consultations/patient/:patientId`);
    console.log(`     GET   /api/ehr/consultations/:id`);
    console.log(`     PUT   /api/ehr/consultations/:id`);
    console.log(`     DELETE /api/ehr/consultations/:id`);
    console.log(`     POST  /api/ehr/consultations/:id/prescriptions`);
    console.log(`     POST  /api/ehr/consultations/:id/lab-orders`);
    console.log(`     PATCH /api/ehr/consultations/:id/lab-orders/:labOrderId/result`);

    console.log(`\n${'='.repeat(60)}\n`);
});
