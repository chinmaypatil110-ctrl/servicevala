import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.host || 'localhost',
  user: process.env.user || 'root',
  password: process.env.pass || '',
  database: process.env.database || 'chinmay',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

export default pool;
