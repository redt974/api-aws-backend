const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const Joi = require("joi");
const { getUserEmail, getUserIdFromToken } = require("../auth/user");
const { createTerraformConfig, runTerraform } = require("./terraform");
const { generateAnsibleInventory, runAnsiblePlaybook } = require("./ansible");
const pool = require("../config/db");

router.post("/create", async (req, res) => {
  // Validation des données d'entrée
  const vmSchema = Joi.object({
    os: Joi.string().required(),
    software: Joi.array().items(Joi.string()).required(),
    extensions: Joi.array().items(Joi.string()).optional(),
    user_name: Joi.string().optional(),
    user_password: Joi.string().optional(),
  });

  const { error } = vmSchema.validate(req.body);
  if (error)
    return res
      .status(400)
      .send(`Erreur de validation : ${error.details[0].message}`);

  const { os, software, extensions, user_name, user_password } = req.body;

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(400).send("Token d'accès manquant.");

  const userId = getUserIdFromToken(token);
  if (!userId) return res.status(401).send("Token invalide ou expiré.");

  const userEmail = await getUserEmail(userId);
  if (!userEmail) return res.status(404).send("Utilisateur non trouvé.");

  const ami = {
    Ubuntu: process.env.AMI_UBUNTU,
    Debian: process.env.AMI_DEBIAN,
    Kali: process.env.AMI_KALI,
    "Windows 10": process.env.AMI_WINDOWS10,
    "Windows 11": process.env.AMI_WINDOWS11,
  }[os];

  if (!ami) return res.status(400).send("OS non pris en charge.");

  try {
    const existingVM = await pool.query(
      "SELECT COUNT(*) FROM vms WHERE user_id = $1 AND expires_at > NOW()",
      [userId]
    );
    if (parseInt(existingVM.rows[0].count) >= 1) {
      return res.status(400).send("Vous avez déjà une VM active.");
    }

    const userDir = path.join(
      __dirname,
      "../terraform",
      `${userEmail}-vm-${crypto.randomBytes(3).toString("hex")}`
    );
    fs.mkdirSync(userDir, { recursive: true });

    const vmName = path.basename(userDir);

    const tfConfigPath = path.join(userDir, "main.tf");
    createTerraformConfig(ami, vmName, tfConfigPath);

    const { publicIp, instanceId, privateKey } = await runTerraform(userDir);

    if (!publicIp || !instanceId || !privateKey) {
      throw new Error("Les sorties Terraform sont incomplètes ou incorrectes.");
    }

    const privateKeyPath = path.join(userDir, "id_rsa");
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

    const inventoryPath = path.join(userDir, "inventory");
    await generateAnsibleInventory(
      { public_ip: publicIp, ssh_private_key_path: privateKeyPath },
      inventoryPath
    );

    await runAnsiblePlaybook(
      inventoryPath,
      software,
      extensions,
      null,
      userEmail,
      user_name,
      user_password
    );

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    const result = await pool.query(
      "INSERT INTO vms (user_id, os, software, public_ip, private_key, expires_at, name, instance_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [
        userId,
        os,
        software,
        publicIp,
        privateKeyPath,
        expiresAt,
        vmName,
        instanceId,
      ]
    );

    res.status(201).json({
      message: "VM créée avec succès.",
      vm_id: result.rows[0].id,
      public_ip: publicIp,
      ssh_private_key: privateKeyPath,
      instance_id: instanceId,
    });
  } catch (err) {
    console.error("Erreur lors de la création de la VM :", err.message);
    res.status(500).send("Erreur interne du serveur.");
  }
});

module.exports = router;
