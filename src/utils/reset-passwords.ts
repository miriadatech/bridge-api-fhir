import bcrypt from 'bcrypt';
import pool from '../config/database';

const PASSWORD = 'Admin123!';
const ROUNDS = 10;

async function resetPasswords() {
    try {
        console.log('🔄 Generando hash para contraseña: Admin123!');

        // Generar hash
        const hash = await bcrypt.hash(PASSWORD, ROUNDS);

        console.log(`\n✅ Hash generado:`);
        console.log(`${hash}`);
        console.log(`\nLongitud: ${hash.length}`);

        // Verificar que el hash es correcto
        const isValid = await bcrypt.compare(PASSWORD, hash);
        console.log(`\n✅ Validación del hash: ${isValid ? 'CORRECTO ✓' : 'INCORRECTO ✗'}`);

        if (!isValid) {
            console.error('❌ El hash generado no es válido!');
            process.exit(1);
        }

        // Actualizar BD
        console.log('\n🔄 Actualizando base de datos...');

        const emails = [
            'admin@bridge.local',
            'doctor.carlos@bridge.local',
            'doctor.juan@bridge.local',
            'nurse.ana@bridge.local',
            'nurse.maria@bridge.local',
            'lab.tech@bridge.local'
        ];

        for (const email of emails) {
            const result = await pool.query(
                'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, password_hash',
                [hash, email]
            );

            if (result.rows.length > 0) {
                console.log(`✅ ${email} - Hash actualizado`);
            } else {
                console.log(`⚠️  ${email} - Usuario no encontrado`);
            }
        }

        // Verificar resultado
        console.log('\n🔍 Verificando hashes en BD:');
        const verification = await pool.query(
            `SELECT email, password_hash, LENGTH(password_hash) as hash_length 
       FROM users WHERE email LIKE '%@bridge.local%'`
        );

        verification.rows.forEach((row: any) => {
            console.log(`${row.email}: ${row.password_hash.substring(0, 20)}... (${row.hash_length} chars)`);
        });

        console.log('\n✅ Contraseñas resetadas correctamente');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetPasswords();
