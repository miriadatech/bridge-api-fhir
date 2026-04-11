import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';

// ============================================================================
// LOGIN
// ============================================================================
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        console.log('Login request:', req.body);

        // Validar entrada
        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
            return;
        }

        console.log(`[AUTH] Login attempt for: ${email}`);

        // Buscar usuario en BD
        const userQuery = `
      SELECT 
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role
      FROM users
      WHERE email = $1
    `;

        const result = await pool.query(userQuery, [email.toLowerCase()]);

        // Usuario no existe
        if (result.rows.length === 0) {
            console.log(`[AUTH] User not found: ${email}`);
            res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
            return;
        }

        const user = result.rows[0];

        console.log(`[AUTH] User found. Hash length: ${user.password_hash.length}`);
        console.log(`[AUTH] Hash preview: ${user.password_hash.substring(0, 20)}...`);

        // ✅ COMPARAR CONTRASEÑA CON BCRYPT
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password_hash);
            console.log(`[AUTH] Password comparison result: ${isPasswordValid}`);
        } catch (bcryptError) {
            console.error(`[AUTH] Bcrypt comparison error:`, bcryptError);
            res.status(500).json({
                success: false,
                error: 'Authentication error'
            });
            return;
        }

        if (!isPasswordValid) {
            console.log(`[AUTH] Invalid password for: ${email}`);
            res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
            return;
        }

        // ✅ GENERAR JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        console.log(`[AUTH] Login successful for: ${email}`);

        // ✅ REGISTRAR EN AUDIT LOG
        try {
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, resource, resource_id, status)
         VALUES ($1, $2, $3, $4, $5)`,
                [user.id, 'LOGIN', 'authentication', user.id, 'success']
            );
        } catch (auditError) {
            console.warn('[AUTH] Could not log audit trail:', auditError);
        }

        // ✅ RESPUESTA EXITOSA
        res.status(200).json({
            success: true,
            token,
            expires_in: '24h',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// ============================================================================
// REGISTER
// ============================================================================
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, first_name, last_name, role } = req.body;

        // Validar entrada
        if (!email || !password || !first_name) {
            res.status(400).json({
                success: false,
                error: 'Email, password, and first_name are required'
            });
            return;
        }

        // Validar contraseña (mínimo 8 caracteres)
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
            return;
        }

        // Verificar si email ya existe
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
            return;
        }

        // ✅ HASHEAR CONTRASEÑA
        const password_hash = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        const insertQuery = `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        role,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role
    `;

        const result = await pool.query(insertQuery, [
            email.toLowerCase(),
            password_hash,
            first_name,
            last_name || '',
            role || 'user',
            'active'
        ]);

        const newUser = result.rows[0];

        // Generar JWT
        const token = jwt.sign(
            {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.status(201).json({
            success: true,
            token,
            user: newUser
        });

    } catch (error) {
        console.error('[AUTH] Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// ============================================================================
// GET CURRENT USER (Validar token)
// ============================================================================
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'No token provided'
            });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const userQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        status
      FROM users
      WHERE id = $1
    `;

        const result = await pool.query(userQuery, [decoded.id]);

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('[AUTH] Get current user error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};
