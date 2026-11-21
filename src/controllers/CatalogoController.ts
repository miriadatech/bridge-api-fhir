// src/controllers/CatalogoController.ts
// GET /api/rda/catalogos/:id  → códigos oficiales de un CodeSystem del Ministerio
// (usa las credenciales IHCE del cliente autenticado; caché de 24 h).
// Útil para mapear las tablas del HIS (etnia, discapacidad, sexo biológico, vía de ingreso…).
import { Request, Response } from 'express';
import pool from '../config/database';
import { getTenant } from '../middleware/auth.middleware';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { MinisterioAuthService } from '../services/MinisterioAuthService';
import { FhirSenderService } from '../services/FhirSenderService';
import { TerminologyService } from '../services/TerminologyService';

const clienteRepository = new ClienteRepository(pool);
const terminology = new TerminologyService(new FhirSenderService(new MinisterioAuthService()));

export async function getCatalogo(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id;
        if (!/^[A-Za-z0-9._-]+$/.test(id)) {
            res.status(400).json({ success: false, error: 'id de CodeSystem inválido' });
            return;
        }
        const cliente = await clienteRepository.getById(getTenant(req).id);
        if (!cliente?.ministry_client_id || !FhirSenderService.baseUrl(cliente)) {
            res.status(409).json({ success: false, error: 'El cliente no tiene credenciales IHCE configuradas (PUT /api/auth/ministry-credentials)' });
            return;
        }
        const codigos = await terminology.listar(cliente, id);
        if (!codigos) {
            res.status(502).json({ success: false, error: `No se pudo obtener el CodeSystem ${id} del Ministerio (revise el nombre o los logs)` });
            return;
        }
        const q = String(req.query.buscar ?? '').toLowerCase();
        const data = q ? codigos.filter(c => c.code.toLowerCase().includes(q) || c.display.toLowerCase().includes(q)) : codigos;
        res.json({ success: true, codesystem: id, total: data.length, data: data.slice(0, 2000) });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message });
    }
}
