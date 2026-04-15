// src/config/database.ts
const { Pool } = require('pg');

const pool = new Pool({

  host: 'localhost', //IP del servidor en la nube MEDISER
  user: 'emrodino',
  password: 'Isys##2021',
  database: 'SSOperabilidad',




});

export default pool;