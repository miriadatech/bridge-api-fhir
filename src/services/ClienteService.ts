// src/services/ClienteService.ts
// Servicio que valida y provee credenciales de cliente para el worker
import { ClienteRepository } from '../repositories/ClienteRepository';
import { ClienteCredenciales } from '../types/worker.types';
import { logger } from '../utils/logger';

export class ClienteService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  /**
   * Obtiene las credenciales de un cliente y valida que sea apto para enviar.
   * Retorna null si el cliente no existe, está inactivo o no puede enviar al Ministerio.
   */
  async getClienteParaEnvio(
    clienteId: string,
  ): Promise<ClienteCredenciales | null> {
    const cliente = await this.clienteRepository.getById(clienteId);

    if (!cliente) {
      logger.warn(
        `[ClienteService] Cliente ${clienteId} no encontrado o inactivo. Omitiendo registros.`,
      );
      return null;
    }

    // Clientes con ministry_mode=disabled no envían al Ministerio
    if (cliente.ministry_mode === 'disabled') {
      logger.info(
        `[ClienteService] Cliente ${cliente.nit} (${clienteId}) tiene ministry_mode=disabled. Omitiendo.`,
      );
      return null;
    }

    // Validar campos mínimos para OAuth (Microsoft Azure AD)
    if (
      !cliente.ministry_client_id ||
      !cliente.ministry_client_secret ||
      !cliente.ministry_tenant_id
    ) {
      logger.warn(
        `[ClienteService] Cliente ${cliente.nit} (${clienteId}) no tiene credenciales OAuth configuradas` +
          ` (ministry_client_id, ministry_client_secret, ministry_tenant_id). Omitiendo.`,
      );
      return null;
    }

    // Validar que tenga URL de API configurada
    if (!cliente.ministry_api_url && !cliente.ministry_api_murl) {
      logger.warn(
        `[ClienteService] Cliente ${cliente.nit} (${clienteId}) no tiene ministry_api_url. Omitiendo.`,
      );
      return null;
    }

    return cliente;
  }

  /**
   * Carga múltiples clientes en batch y filtra los no aptos para envío.
   * Más eficiente que llamar getClienteParaEnvio() uno por uno.
   */
  async getClientesBatch(
    clienteIds: string[],
    clienteRepository: ClienteRepository,
  ): Promise<Map<string, ClienteCredenciales>> {
    const todos = await clienteRepository.getByIds(clienteIds);
    const aptos = new Map<string, ClienteCredenciales>();

    for (const [id, cliente] of todos) {
      if (
        cliente.ministry_mode === 'disabled' ||
        !cliente.ministry_client_id ||
        !cliente.ministry_client_secret ||
        !cliente.ministry_tenant_id ||
        (!cliente.ministry_api_url && !cliente.ministry_api_murl)
      ) {
        logger.info(
          `[ClienteService] Cliente ${cliente.nit} omitido por configuración incompleta.`,
        );
        continue;
      }
      aptos.set(id, cliente);
    }

    return aptos;
  }
}
