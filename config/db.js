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

    // Création de la table `utilisateurs` avec le champ sel
    await pool.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,               -- ID unique pour chaque utilisateur
        nom VARCHAR(50) NOT NULL,            -- Nom de l'utilisateur
        prenom VARCHAR(50) NOT NULL,         -- Prénom de l'utilisateur
        email VARCHAR(100) UNIQUE NOT NULL,  -- Email unique de l'utilisateur
        password TEXT NOT NULL,              -- Mot de passe haché
        sel TEXT NOT NULL,                   -- Sel utilisé pour le hachage du mot de passe
        remember_me_token TEXT,              -- Token de "souviens-toi de moi" (optionnel)
        created_at TIMESTAMP DEFAULT NOW()   -- Date de création de l'utilisateur
      )
    `);
    console.log("Table Utilisateurs initialisée.");

    // Création de la table `reset_tokens`
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id SERIAL PRIMARY KEY,               -- Identifiant unique pour chaque reset_token
        utilisateur_id INT NOT NULL,         -- Référence à l'utilisateur
        token VARCHAR(255) NOT NULL,         -- Token de réinitialisation
        expires BIGINT NOT NULL,             -- Timestamp d'expiration
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      )
    `);
    console.log("Table Reset_Tokens initialisée.");
  } catch (err) {
    console.error("Erreur lors de l'initialisation des tables :", err.message);
  }
})();

module.exports = pool;
