import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Base de datos conectada: ${new Date().toISOString()}`);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`\n📋 ENDPOINTS DISPONIBLES:\n`);
    console.log(`  🔓 SIN AUTENTICACIÓN:`);
    console.log(`     GET  http://localhost:${PORT}/health`);
    console.log(`     POST http://localhost:${PORT}/api/auth/register`);
    console.log(`     POST http://localhost:${PORT}/api/auth/login`);
    console.log(`\n  🔒 CON AUTENTICACIÓN (requiere JWT token):`);
    console.log(`     GET  http://localhost:${PORT}/api/ehr/patients`);
    console.log(`     POST http://localhost:${PORT}/api/ehr/patients`);
    console.log(`     GET  http://localhost:${PORT}/api/ehr/consultations`);
    console.log(`     POST http://localhost:${PORT}/api/ehr/consultations`);
    console.log(`\n🏥 Modo Ministerio: ${process.env.MINISTRY_MODE || 'sandbox'}\n`);
});
