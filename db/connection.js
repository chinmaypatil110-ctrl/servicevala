const dotenv = require('dotenv')
const mysql = require('mysql2');

dotenv.config()
const connection = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.pass,
    database: process.env.database
  });
  module.exports = connection;
