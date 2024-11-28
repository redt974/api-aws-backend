const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyCaptcha } = require("../services/captcha");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validerLoginForm } = require("./validation");

const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_JWT_SECRET;

router.post("/", async (req, res) => {
  const { email, mot_de_passe, captchaValue, rememberMe } = req.body;

  // Validation des données du formulaire
  const validation = validerLoginForm({ email, mot_de_passe });
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    // Vérification du CAPTCHA
    await verifyCaptcha(captchaValue);

    // Recherche de l'utilisateur dans la base de données
    const result = await db.query(
      "SELECT id, password, sel FROM utilisateurs WHERE email = $1",
      [email]
    );
    if (!result.rows || result.rows.length === 0) {
      return res
        .status(401)
        .json({
          message:
            "Utilisateur non trouvé. Veuillez faire une demande d'inscription.",
        });
    }

    const { id, password: mot_de_passe_hash, sel } = result.rows[0];

    // Vérification du mot de passe
    const validPassword = await bcrypt.compare(
      mot_de_passe + sel,
      mot_de_passe_hash
    );
    if (!validPassword) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    // Création des tokens
    const accessToken = jwt.sign({ id }, secretKey, { expiresIn: "30m" });
    const refreshToken = jwt.sign({ id }, refreshSecretKey, {
      expiresIn: "7d",
    });

    // Stockage du refreshToken dans un cookie sécurisé
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes
    });

    // Gestion de l'option "Remember Me"
    if (rememberMe) {
      const rememberMeToken = jwt.sign({ id }, refreshSecretKey, {
        expiresIn: "30d",
      });
      await db.query(
        "UPDATE utilisateurs SET remember_me_token = $1 WHERE id = $2",
        [rememberMeToken, id]
      );
      res.cookie("rememberMeToken", rememberMeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours en millisecondes
      });
    }

    // Connexion réussie
    return res.status(200).json({ message: "Connexion réussie.", accessToken });
  } catch (err) {
    console.error("Erreur lors de la connexion:", err.message || err);
    return res
      .status(500)
      .json({
        message:
          "Une erreur interne est survenue. Veuillez réessayer plus tard.",
      });
  }
});

module.exports = router;
