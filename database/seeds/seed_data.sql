-- Insertar usuario de prueba
INSERT INTO users (id, email, password_hash, first_name, last_name, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', '\\\', 'Admin', 'User', 'admin')
ON CONFLICT DO NOTHING;

-- Insertar pacientes de prueba
INSERT INTO patients (id, identifier, identifier_system, family_name, given_name, gender, birth_date, email, city, country)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '12345678', 'http://example.com/mrn', 'García', 'Juan', 'male', '1980-01-15', 'juan@example.com', 'Bogotá', 'Colombia'),
  ('550e8400-e29b-41d4-a716-446655440002', '87654321', 'http://example.com/mrn', 'López', 'María', 'female', '1985-06-20', 'maria@example.com', 'Medellín', 'Colombia')
ON CONFLICT DO NOTHING;
