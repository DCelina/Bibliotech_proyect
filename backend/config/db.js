/**
 * Pool de conexiones a MariaDB (el driver mysql2 es compatible con MariaDB).
 * Las credenciales salen del archivo .env para no exponerlas en el código.
 * El pool es lazy: no se conecta hasta que se ejecuta la primera consulta.
 */
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Se exporta la versión con promesas para usar async/await en los repositorios
module.exports = pool.promise();
