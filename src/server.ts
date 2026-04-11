// src/server.ts
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Base de datos conectada: ${new Date().toISOString()}`);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`👥 Pacientes:    http://localhost:${PORT}/api/patients`);
    console.log(`🏥 Consultas:    http://localhost:${PORT}/api/consultations`); // 👈 Agregar
    console.log(`🏥 Modo Ministerio: ${process.env.MINISTRY_MODE || 'sandbox'}`);
});
