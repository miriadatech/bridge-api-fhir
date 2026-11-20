// src/server.ts
import './config/env';
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    const line = '='.repeat(64);
    console.log(`\n${line}\n🚀  Bridge API FHIR — Servidor iniciado\n${line}`);
    console.log(`📡  URL:  http://localhost:${PORT}`);
    console.log(`🌍  ENV:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`
  🔓 Públicos
     GET   /health
     POST  /api/auth/register            (x-admin-key si ADMIN_API_KEY está definido)

  🔑 Autenticados (header x-api-key: baf_...)
     Cliente
       GET   /api/auth/profile
       PUT   /api/auth/ministry-credentials
       POST  /api/auth/regenerate-key

     RDA  (tipo = paciente | consulta | urgencias | hospitalizacion)
       GET   /api/rda/tipos
       POST  /api/rda/:tipo/translate      → valida y devuelve el Bundle (no guarda)
       POST  /api/rda/:tipo                → valida, traduce y encola para MinSalud
       GET   /api/rda/envios               → listar (?estado=&tipo=&desde=&hasta=&page=)
       GET   /api/rda/envios/resumen       → conteo por tipo/estado
       GET   /api/rda/envios/:id           → estado + respuesta del Ministerio
       PUT   /api/rda/envios/:id           → corregir JSON de un envío fallido
       POST  /api/rda/envios/:id/reintentar

     Legado (compatibilidad)
       POST  /api/ehr/rda/translate            (= /api/rda/paciente)
       POST  /api/ehr/rda/ambulatory/translate (= /api/rda/consulta)
${line}\n`);
});
