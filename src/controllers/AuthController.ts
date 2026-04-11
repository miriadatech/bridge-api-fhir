import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      const { user, token } = await AuthService.register(email, password, firstName, lastName, role || 'patient');
      res.status(201).json({ user, token });
    } catch (error: any) {
      res.status(error.message === 'User already exists' ? 409 : 500).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      console.log('Login request:', req.body);
      const { email, password } = req.body;
      const { user, token } = await AuthService.login(email, password);
      res.json({ user, token });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
}
