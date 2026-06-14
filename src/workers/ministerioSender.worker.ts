// src/workers/ministerioSender.worker.ts
// Worker autónomo de envío de registros FHIR al Ministerio
// Ejecutar con: npm run worker:dev  ó  npm run worker:start
import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';

// Cargar .env desde src/.env (ruta relativa al proceso)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Pool } from 'pg';
import { workerConfig } from '../config/workerConfig';
import { logger } from '../utils/logger';
import { FhirRepository } from '../repositories/FhirRepository';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { ClienteService } from '../services/ClienteService';
import { MinisterioAuthService } from '../services/MinisterioAuthService';
import { FhirSenderService } from '../services/FhirSenderService';
import { RegistroFhir, ResumenEjecucion } from '../types/worker.types';
import { PoolClient } from 'pg';

// ─── Pool de BD exclusivo para el worker ────────────────────────────────────
const pool = new Pool({
  ...workerConfig.db,
});

pool.on('error', (err) => {
  logger.error(`[Worker] Error en pool de BD: ${err.message}`);
});

// ─── Instancias de servicios (singleton por proceso) ─────────────────────────
const fhirRepository    = new FhirRepository(pool);
const clienteRepository = new ClienteRepository(pool);
const clienteService    = new ClienteService(clienteRepository);
const authService       = new MinisterioAuthService();
const fhirSender        = new FhirSenderService(authService, workerConfig.timeoutAxiosMs);

// ─── Flag para evitar ejecuciones solapadas ──────────────────────────────────
let ejecutando = false;

// ─── LÓGICA PRINCIPAL DEL WORKER ─────────────────────────────────────────────

async function ejecutarCiclo(): Promise<void> {
  if (ejecutando) {
    logger.warn('[Worker] Ciclo anterior aún en ejecución. Saltando este ciclo.');
    return;
  }

  ejecutando = true;
  const inicioCiclo = Date.now();

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('[Worker] ▶ Iniciando ciclo de envío al Ministerio');

  const resumen: ResumenEjecucion = {
    total: 0,
    enviados: 0,
    errores: 0,
    omitidos: 0,
    duracionMs: 0,
  };

  let txClient: PoolClient | null = null;

  try {
    // ── Paso 0: Recuperar registros huérfanos en estado ENVIANDO ───────────
    const huerfanos = await fhirRepository.resetearEnviandoHuerfanos();
    if (huerfanos > 0) {
      logger.warn(
        `[Worker] ${huerfanos} registro(s) huérfano(s) en ENVIANDO recuperados → REINTENTANDO`,
      );
    }

    // ── Paso 1: Obtener y bloquear registros pendientes ────────────────────
    const { registros, client } = await fhirRepository.getYBloquearPendientes(
      workerConfig.maxRegistrosPorCiclo,
      workerConfig.maxIntentos,
    );
    txClient = client;

    resumen.total = registros.length;

    if (registros.length === 0) {
      logger.info('[Worker] Sin registros pendientes en este ciclo.');
      await fhirRepository.commitTransaction(txClient);
      txClient = null;
      return;
    }

    logger.info(`[Worker] ${registros.length} registro(s) encontrado(s) para procesar.`);

    // ── Paso 2: Marcar todos como ENVIANDO dentro de la transacción ─────────
    for (const registro of registros) {
      await fhirRepository.marcarEnviando(registro.id, txClient);
    }

    // ── Commit del lock: libera la transacción PG, el lock se mantiene ──────
    // Los registros ya están en ENVIANDO, no serán tomados por otro worker.
    await fhirRepository.commitTransaction(txClient);
    txClient = null;

    // ── Paso 3: Agrupar registros por cliente (ips_id) ──────────────────────
    const porCliente = agruparPorCliente(registros);
    logger.info(`[Worker] ${porCliente.size} cliente(s) distintos en este ciclo.`);

    // ── Paso 4: Cargar credenciales de clientes en batch ────────────────────
    const clienteIds = Array.from(porCliente.keys());
    const clientesAptos = await clienteService.getClientesBatch(
      clienteIds,
      clienteRepository,
    );

    // ── Paso 5: Procesar cada cliente y sus registros ────────────────────────
    for (const [clienteId, registrosCliente] of porCliente) {
      const cliente = clientesAptos.get(clienteId);

      if (!cliente) {
        logger.warn(
          `[Worker] Cliente ${clienteId} omitido (sin credenciales válidas). ` +
            `${registrosCliente.length} registro(s) marcados como ERROR.`,
        );

        // Marcar registros de este cliente como error de configuración
        for (const reg of registrosCliente) {
          await fhirRepository.marcarError(
            reg.id,
            'Cliente sin credenciales Ministerio configuradas',
            reg.intentos,
            workerConfig.maxIntentos,
          );
          resumen.omitidos++;
        }
        continue;
      }

      logger.info(
        `[Worker] Procesando cliente: ${cliente.nit} (${cliente.nombre}) → ` +
          `${registrosCliente.length} registro(s)`,
      );

      // ── Paso 6: Enviar cada registro del cliente ──────────────────────────
      for (const registro of registrosCliente) {
        const resultado = await fhirSender.enviar(
          registro.id,
          cliente,
          registro.payload_fhir,
        );

        if (resultado.exitoso) {
          await fhirRepository.marcarEnviado(
            registro.id,
            resultado.ministerioId ?? null,
            resultado.respuesta ?? {},
          );
          resumen.enviados++;

          logger.info(
            `[Worker] ✅ #${registro.id} enviado | uuid: ${registro.uuid_evento} | ` +
              `ministerioId: ${resultado.ministerioId} | ${resultado.duracionMs}ms`,
          );
        } else {
          await fhirRepository.marcarError(
            registro.id,
            resultado.error ?? 'Error desconocido',
            registro.intentos,
            workerConfig.maxIntentos,
          );
          resumen.errores++;

          const intentosUsados = registro.intentos + 1;
          logger.error(
            `[Worker] ❌ #${registro.id} falló (intento ${intentosUsados}/${workerConfig.maxIntentos}) | ` +
              `${resultado.error}`,
          );
        }
      }
    }
  } catch (err: unknown) {
    // Rollback si quedó una transacción abierta
    if (txClient) {
      await fhirRepository.rollbackTransaction(txClient);
      txClient = null;
    }

    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Worker] 💥 Error crítico en ciclo: ${msg}`, { error: err });
  } finally {
    ejecutando = false;
    resumen.duracionMs = Date.now() - inicioCiclo;

    logger.info(
      `[Worker] ◀ Ciclo finalizado | ` +
        `total=${resumen.total} enviados=${resumen.enviados} ` +
        `errores=${resumen.errores} omitidos=${resumen.omitidos} ` +
        `duración=${resumen.duracionMs}ms`,
    );
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function agruparPorCliente(
  registros: RegistroFhir[],
): Map<string, RegistroFhir[]> {
  const mapa = new Map<string, RegistroFhir[]>();

  for (const registro of registros) {
    const lista = mapa.get(registro.ips_id) ?? [];
    lista.push(registro);
    mapa.set(registro.ips_id, lista);
  }

  return mapa;
}

// ─── ARRANQUE DEL WORKER ──────────────────────────────────────────────────────

async function iniciar(): Promise<void> {
  logger.info('╔══════════════════════════════════════════════════╗');
  logger.info('║   Worker: Ministerio FHIR Sender                ║');
  logger.info('╚══════════════════════════════════════════════════╝');
  logger.info(`[Worker] Intervalo: ${workerConfig.intervalSeconds}s`);
  logger.info(`[Worker] Max intentos: ${workerConfig.maxIntentos}`);
  logger.info(`[Worker] Max registros/ciclo: ${workerConfig.maxRegistrosPorCiclo}`);
  logger.info(`[Worker] BD: ${workerConfig.db.host}:${workerConfig.db.port}/${workerConfig.db.database}`);

  // Verificar conexión a BD antes de iniciar
  try {
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    logger.info('[Worker] ✅ Conexión a PostgreSQL establecida.');
  } catch (err) {
    logger.error(
      `[Worker] ❌ No se pudo conectar a PostgreSQL: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }

  // Primer ciclo inmediato
  await ejecutarCiclo();

  // Ciclos periódicos
  const intervalo = setInterval(
    () => { void ejecutarCiclo(); },
    workerConfig.intervalSeconds * 1_000,
  );

  // ─── Shutdown limpio ──────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[Worker] Señal ${signal} recibida. Cerrando limpiamente...`);
    clearInterval(intervalo);

    // Esperar a que termine el ciclo en curso (máx 60s)
    const deadline = Date.now() + 60_000;
    while (ejecutando && Date.now() < deadline) {
      await sleep(500);
    }

    if (ejecutando) {
      logger.warn('[Worker] Ciclo activo no terminó en 60s. Forzando cierre.');
    }

    await pool.end();
    logger.info('[Worker] Pool de BD cerrado. Worker detenido.');
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT'); });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────
iniciar().catch((err) => {
  logger.error(`[Worker] Error fatal al iniciar: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
