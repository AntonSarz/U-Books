/* ─────────────────────────────────
   Configuracion de la Base de datos
───────────────────────────────── */
// Este modulo establece el pool de conexiones hacia la base de datos MySQL
// Utilizando promise para permitir un flujo asincrono.

const mysql = require('mysql2/promise');
require('dotenv').config(); //carga variables de entorno dende el archivo .env

// Creacion del pool de conexiones para optimizar el rendimiento
const pool = mysql.createPool({
    // variables de entorno mapeadas
    host: process.env.DB_HOST,              // Direccion del servidor
    user: process.env.DB_USER,              // Usuario administrador de mysql
    password: process.env.DB_PASSWORD,      // Contraseña del usuario administrador
    database: process.env.DB_NAME,          // Nombre de la base de datos
    
    // Gestion del pool de conexiones
    waitForConnections: true,               // si el limite se alcanza, espera hasta que se libere una conexion
    connectionLimit: 10                     // limite de conexiones
})

// Exportamos el pool de conexiones para que pueda ser reutilizado
module.exports = pool;