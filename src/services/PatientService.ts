import pool from '../config/database';
import { Patient } from '../models/Patient';
import { v4 as uuidv4 } from 'uuid';

export class PatientService {
  static async getAllPatients(limit: number = 20, offset: number = 0) {
    const result = await pool.query(
      'SELECT * FROM patients ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  static async getPatientById(id: string) {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new Error('Patient not found');
    return result.rows[0];
  }

  static async createPatient(patient: Patient) {
    const id = uuidv4();
    console.log(patient);
    const result = await pool.query(
      'INSERT INTO patients (id, family_name, given_name, gender, birth_date, identifier_value) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, patient.name?.[0]?.family, patient.name?.[0]?.given?.[0], patient.gender, patient.birthDate, patient.identifier?.[0]?.value]
    );
    return result.rows[0];
  }

  static async updatePatient(id: string, patient: Patient) {
    const result = await pool.query(
      'UPDATE patients SET family_name = $1, given_name = $2, gender = $3, birth_date = $4 WHERE id = $5 RETURNING *',
      [patient.name?.[0]?.family, patient.name?.[0]?.given?.[0], patient.gender, patient.birthDate, id]
    );
    return result.rows[0];
  }

  static async deletePatient(id: string) {
    const result = await pool.query('DELETE FROM patients WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }
}
