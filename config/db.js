const { Pool } = require("pg");
require("dotenv").config();

// Création du pool de connexion PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Initialisation des tables
(async () => {
  try {
    // Création de la table `vms`
    await pool.query(`
          CREATE TABLE IF NOT EXISTS vms (
              id SERIAL PRIMARY KEY,
              os VARCHAR(50) NOT NULL,
              software TEXT,
              public_ip VARCHAR(50),
              private_key TEXT,
              created_at TIMESTAMP DEFAULT NOW(),
              expires_at TIMESTAMP
          )
      `);
    console.log("Table VMs initialisée.");

    // Création de la table `utilisateurs`
    await pool.query(`
          CREATE TABLE IF NOT EXISTS utilisateurs (
              id SERIAL PRIMARY KEY,
              nom VARCHAR(50) NOT NULL,
              prenom VARCHAR(50) NOT NULL,
              email VARCHAR(100) UNIQUE NOT NULL,
              password TEXT NOT NULL,
              remember_me_token TEXT,
              created_at TIMESTAMP DEFAULT NOW()
          )
      `);
    console.log("Table Utilisateurs initialisée.");
  } catch (err) {
    console.error("Erreur lors de l'initialisation des tables :", err.message);
  }
})();

module.exports = pool;
