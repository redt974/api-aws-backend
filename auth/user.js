const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function getUserEmail(userId) {
  try {
    const res = await pool.query("SELECT email FROM utilisateurs WHERE id = $1", [userId]);
    return res.rows[0] ? res.rows[0].email : null;
  } catch (err) {
    console.error("Erreur lors de la récupération de l'email : ", err.message);
    return null;
  }
}

module.exports = { getUserEmail };
