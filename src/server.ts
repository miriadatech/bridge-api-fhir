import app from './app';
import pool from './config/database';

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        // Verificar conexión a BD
        const dbCheck = await pool.query('SELECT NOW() as time');
        console.log('✅ Base de datos conectada:', dbCheck.rows[0].time);

        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
            console.log(`👥 Pacientes:    http://localhost:${PORT}/api/patients`);
            console.log(`🏥 Modo Ministerio: ${process.env.MINISTRY_MODE || 'sandbox'}`);
        });

    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

start();
