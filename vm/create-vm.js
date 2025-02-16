const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { getUserEmail } = require("../auth/user");
const { createTerraformConfig, runTerraform } = require("./terraform");
const { generateAnsibleInventory, runAnsiblePlaybook } = require("./ansible");
const pool = require("../config/db");
const { io } = require("../index.js");

router.post("/create", async (req, res) => {
  let { os, software, extensions, user_name, user_password } = req.body;

  // Normalisation pour garantir que ce sont toujours des tableaux
  software = Array.isArray(software) ? software : (software ? [software] : []);
  extensions = Array.isArray(extensions) ? extensions : (extensions ? [extensions] : []);  
  
  const user_id = req.user.id;  // Récupère l'ID utilisateur injecté par le middleware

  const user_email = await getUserEmail(user_id);
  if (!user_email) {
    return res.status(404).json({ message: "Utilisateur non trouvé." });
  }

  // Vérification de l'OS
  const ami = {
    Ubuntu: process.env.AMI_UBUNTU,
    Debian: process.env.AMI_DEBIAN,
    Kali: process.env.AMI_KALI,
    "Windows 10": process.env.AMI_WINDOWS10,
    "Windows 11": process.env.AMI_WINDOWS11,
  }[os];

  if (!ami) return res.status(400).json({ message: "OS non pris en charge."});

  // const userMapping = {
  //   Ubuntu: 'ubuntu',
  //   Debian: 'debian',
  //   Kali: 'kali',
  //   "Windows 10": 'Administrator',
  //   "Windows 11": 'Administrator',
  // };

  // const ansibleUser = userMapping[os];

  const socketId = req.headers["socket-id"]; // Récupérer l'ID socket du client
  const emitProgress = (message) => {
    if (socketId && io.sockets.sockets.get(socketId)) {
      io.to(socketId).emit("progress", message);
    }
    
  };  

  try {
    emitProgress("🔄 Initialisation de la création de la VM...");
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

    emitProgress("🔄 Création de la VM...");
    // Création du fichier Terraform
    createTerraformConfig(ami, vm_name, user_name, user_password, tfConfigPath);

    emitProgress("🔄 Lancement de la VM...");
    // Exécution de Terraform
    try {
      const { public_ip, instance_id, private_key } = await runTerraform(userDir);
      if (!public_ip || !instance_id || !private_key) {
        throw new Error("Les sorties Terraform sont incomplètes ou incorrectes.");
      }
    } catch (err) {
      emitProgress("❌ Erreur lors du déploiement de la VM.");
      console.error("Erreur Terraform :", err.message);
      return res.status(500).json({ message: "Erreur lors du déploiement de la VM." });
    }
    
    emitProgress("✅ VM créée avec succès...");

    // Sauvegarde de la clé privée
    const privateKeyPath = path.join(userDir, "id_rsa");
    fs.writeFileSync(privateKeyPath, private_key, { mode: 0o600 });

    emitProgress("🔄 Installation des logiciels dans la VM...");
    // Création de l'inventaire Ansible
    const inventoryPath = path.join(userDir, "inventory");
    await generateAnsibleInventory({ public_ip, user_name, ssh_private_key: privateKeyPath }, inventoryPath);
    
    const playbook = path.resolve(__dirname, `../playbooks/${os.includes("Windows") ? "Windows" : "Linux"}/vm-${os.toLowerCase()}.yml`);

    emitProgress("🔄 Installation des logiciels dans la VM en cours...");
    // Exécution du playbook Ansible
    try {
      await runAnsiblePlaybook(
        inventoryPath,
        playbook, 
        software,
        extensions,
        user_name,
        user_password,
        user_email,
        instance_id,
        privateKeyPath,
        public_ip,
        emitProgress
      );
      if (!inventoryPath || !playbook || !software|| !extensions|| !user_name|| !user_password|| !privateKeyPath|| !public_ip) {
        throw new Error("Les sorties Ansible sont incomplètes ou incorrectes.");
      }
    } catch (err) {
      emitProgress("❌ Erreur lors de l'installation des logiciels de la VM.");
      console.error("Erreur Ansible :", err.message);
      return res.status(500).json({ message: "Erreur lors de l'installation des logiciels de la VM" });
    }

    emitProgress("🌐 Déploiement de la VM en cours...");
    // Insertion dans la base de données
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // Expiration dans 12 heures
    const result = await pool.query("INSERT INTO vms (user_id, os, software, public_ip, private_key, expires_at, name, instance_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", 
      [user_id, os, software, public_ip, privateKeyPath, expiresAt, vm_name, instance_id]);

    emitProgress("🚀 VM créée avec succès et prête !");
    res.status(201).json({
      vm_id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      user_name: user_name,
      instance_id: instance_id,
      ip: public_ip,
      message: "VM créée avec succès."
    });
  } catch (err) {
    emitProgress("❌ Erreur lors de la création de la VM !");
    console.error("Erreur lors de la création de la VM :", err.message);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;
