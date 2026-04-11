import pool from '../config/database';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  static async register(email: string, password: string, firstName: string, lastName: string, role: string = 'patient') {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) throw new Error('User already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const result = await pool.query(
      'INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role',
      [id, email, passwordHash, firstName, lastName, role]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id as string, email: user.email as string, firstName: user.first_name as string, lastName: user.last_name as string, role: user.role as string } as object,
      config.jwt.secret as string,
      { expiresIn: config.jwt.expiration as any }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    };
  }

  static async login(email: string, password: string) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) throw new Error('Invalid credentials');

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { id: user.id as string, email: user.email as string, firstName: user.first_name as string, lastName: user.last_name as string, role: user.role as string } as object,
      config.jwt.secret as string,
      { expiresIn: config.jwt.expiration as any }
    );

    return { user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role }, token };
  }
}
