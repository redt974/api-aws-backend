const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { getUserEmail, getUserIdFromToken } = require("../auth/user");
const { createTerraformConfig, runTerraform } = require("./terraform");
const { generateAnsibleInventory, runAnsiblePlaybook } = require("./ansible");
const pool = require("../config/db");
const { generateVPNConfig } = require("./vpn");

router.post("/create", async (req, res) => {
  let { os, software, extensions, user_name, user_password } = req.body;

  // Normalisation pour garantir que ce sont toujours des tableaux
  software = Array.isArray(software) ? software : [software];
  extensions = Array.isArray(extensions) ? extensions : [extensions];
  
  // Vérification du token d'accès
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(400).json({ message: "Token d'accès manquant."});

  const user_id = getUserIdFromToken(token);
  if (!user_id) return res.status(401).json({ message: "Token invalide ou expiré."});

  const user_email = await getUserEmail(user_id);
  if (!user_email) return res.status(404).json({ message: "Utilisateur non trouvé."});

  // Vérification de l'OS
  const ami = {
    Ubuntu: process.env.AMI_UBUNTU,
    Debian: process.env.AMI_DEBIAN,
    Kali: process.env.AMI_KALI,
    "Windows 10": process.env.AMI_WINDOWS10,
    "Windows 11": process.env.AMI_WINDOWS11,
  }[os];

  if (!ami) return res.status(400).json({ message: "OS non pris en charge."});

  try {
    // Vérification des VMs actives de l'utilisateur
    const existingVM = await pool.query("SELECT COUNT(*) FROM vms WHERE user_id = $1 AND expires_at > NOW()", [user_id]);
    if (parseInt(existingVM.rows[0].count) >= 1) {
      return res.status(400).json({ message: "Vous avez déjà une VM active."});
    }

    // Création du dossier utilisateur
    const userDir = path.join(__dirname, "../terraform", `${user_email}-vm-${crypto.randomBytes(3).toString("hex")}`);
    fs.mkdirSync(userDir, { recursive: true });

    const vm_name = path.basename(userDir);

    const tfConfigPath = path.join(userDir, "main.tf");

    // Création du fichier Terraform
    createTerraformConfig(ami, vm_name, tfConfigPath);

    // Exécution de Terraform
    const { public_ip, instance_id, private_key } = await runTerraform(userDir);

    if (!public_ip || !instance_id || !private_key) {
      throw new Error("Les sorties Terraform sont incomplètes ou incorrectes.");
    }

    // Sauvegarde de la clé privée
    const privateKeyPath = path.join(userDir, "id_rsa");
    fs.writeFileSync(privateKeyPath, private_key, { mode: 0o600 });

    // Création de l'inventaire Ansible
    const inventoryPath = path.join(userDir, "inventory");
    await generateAnsibleInventory({ public_ip: public_ip, os: os, ssh_private_key: privateKeyPath }, inventoryPath);
    
    const ovpnConfigServeur = path.join(__dirname, 'openvpn-server.conf');

    // Exécution du playbook Ansible
    await runAnsiblePlaybook(
      inventoryPath,
      software,
      extensions,
      ovpnConfigServeur,
      user_email,
      user_name,
      user_password
    );

    // Création du fichier de configuration OpenVPN client
    const vpnConfigClient = await generateVPNConfig(public_ip, user_email, instance_id, userDir);

    // Insertion dans la base de données
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // Expiration dans 12 heures
    const result = await pool.query("INSERT INTO vms (user_id, os, software, public_ip, private_key, expires_at, name, instance_id, vpn_config) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id", 
      [user_id, os, software, public_ip, privateKeyPath, expiresAt, vm_name, instance_id, vpnConfigClient]);

    res.status(201).json({
      vm_id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      user_email: user_email,
      instance_id: instance_id,
      ip: public_ip,
      ssh_private_key: privateKeyPath,
      message: "VM créée avec succès."
    });
  } catch (err) {
    console.error("Erreur lors de la création de la VM :", err.message);
    res.status(500).json({ message: "Erreur interne du serveur."});
  }
});

module.exports = router;
