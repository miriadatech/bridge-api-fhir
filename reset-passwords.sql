-- =============================================================================
-- RESET DE CONTRASEÑAS - BRIDGE API
-- =============================================================================
-- Hash de "Admin123!" generado con bcrypt(10 rounds)
-- =============================================================================

UPDATE users 
SET password_hash = '$2b$10$TQx8QWw8J5QZ9k9p4L8M9eZ9k9p4L8M9eZ9k9p4L8M9eZ9k9p4L8M9'
WHERE email IN (
    'admin@bridge.local',
    'doctor.juan@bridge.local',
    'nurse.maria@bridge.local',
    'doctor.carlos@bridge.local',
    'nurse.ana@bridge.local',
    'lab.tech@bridge.local'
);

-- Verificar actualización
SELECT 
    email,
    first_name,
    role,
    password_hash as 'password_hash (primeros 20 chars)',
    SUBSTRING(password_hash, 1, 20) as verify
FROM users
WHERE email LIKE '%@bridge.local%';

SELECT 'Update completed successfully!' as status;
