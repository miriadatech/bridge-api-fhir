import pool from '../config/database';

class SaveRdaService {

    async saveRdaRecibidas(data: any, tenant: any, payload_fhir: any) {
        const conexion = await pool.connect();
        try {

            const result = await conexion.query(`SELECT id FROM clientes `)


            const query = `
                INSERT INTO interoperabilidad_recibida (
                        uuid_evento,
                        ips_id,
                        historia_id,
                        tipo_evento,
                        payload_original,
                        payload_fhir
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
            `;
            await conexion.query(query, [
                tenant.idevento,
                tenant.id,
                data.historia_id,
                data.tipo_evento,
                data,
                payload_fhir
            ]);
            console.log('RDA guardado en la base de datos');
        } catch (error) {
            console.log('Error al guardar el RDA en la base de datos:', error);
            throw error;
        } finally {
            conexion.release();
        }
    }
}

const saveRdaService = new SaveRdaService();
export default saveRdaService;
