import pool from '../config/database';
import { Encounter } from '../models/Encounter';
import { v4 as uuidv4 } from 'uuid';

export class EncounterService {
  static async getAllEncounters(patientId?: string, limit: number = 20, offset: number = 0) {
    const where = patientId ? 'WHERE patient_id = $1' : '';
    const params = patientId ? [patientId, limit, offset] : [limit, offset];
    const query_str = 'SELECT * FROM encounters ' + where + ' ORDER BY start_time DESC LIMIT \$' + (patientId ? '3' : '1') + ' OFFSET \$' + (patientId ? '4' : '2');
    const result = await pool.query(query_str, params);
    return result.rows;
  }

  static async getEncounterById(id: string) {
    const result = await pool.query('SELECT * FROM encounters WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new Error('Encounter not found');
    return result.rows[0];
  }

  static async createEncounter(encounter: Encounter) {
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO encounters (id, patient_id, status, start_time) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [id, encounter.subject.reference.replace('Patient/', ''), encounter.status]
    );
    return result.rows[0];
  }
}
