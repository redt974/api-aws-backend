const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("../config/db"); 
const { Client } = require("ssh2"); 

// Génération d'une clé SSH dynamique
function generateSSHKey() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

router.post("/create", async (req, res) => {
  const { os, software, extensions } = req.body; // Ajout du paramètre extensions
  const ami = {
    Ubuntu: process.env.AMI_UBUNTU,
    Debian: process.env.AMI_DEBIAN,
    Kali: process.env.AMI_KALI,
    "Windows 10": process.env.AMI_WINDOWS10,
    "Windows 11": process.env.AMI_WINDOWS11,
  }[os];

  if (!ami) return res.status(400).send("OS non pris en charge.");

  try {
    const existingVM = await pool.query("SELECT COUNT(*) FROM vms WHERE expires_at > NOW()");
    if (parseInt(existingVM.rows[0].count) >= 1) {
      return res.status(400).send("Vous avez déjà une VM active.");
    }

    const { publicKey, privateKey } = generateSSHKey();
    fs.writeFileSync("keys/ssh_key.pem", privateKey);

    const tfConfig = `
provider "aws" {
  region = "${process.env.AWS_REGION}"
}

resource "aws_instance" "vm" {
  ami           = "${ami}"
  instance_type = "${process.env.INSTANCE_TYPE}"
  key_name      = "dynamic-key"
  tags = {
    Name = "custom-vm"
  }
}

output "public_ip" {
  value = aws_instance.vm.public_ip
}
    `;

    const terraformConfigPath = path.join(__dirname, "../terraform/generated/vm-config.tf");
    fs.writeFileSync(terraformConfigPath, tfConfig);

    exec("cd terraform && terraform init && terraform apply -auto-approve", async (err, stdout) => {
      if (err) {
        console.error(`Erreur Terraform : ${err.message}`);
        return res.status(500).send("Erreur lors de la création de la VM.");
      }

      const ipMatch = stdout.match(/public_ip = "(.*)"/);
      const publicIp = ipMatch ? ipMatch[1] : null;

      if (!publicIp) return res.status(500).send("Erreur lors de la récupération de l'adresse IP.");

      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h
      const result = await pool.query(
        "INSERT INTO vms (os, software, public_ip, private_key, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [os, software, publicIp, privateKey, expiresAt]
      );

      // Installer VSCode et les extensions sur la VM
      installVSCodeAndExtensions(publicIp, privateKey, extensions);

      res.status(201).json({
        message: "VM créée avec succès.",
        vm_id: result.rows[0].id,
        public_ip: publicIp,
        ssh_private_key: privateKey,
      });
    });
  } catch (err) {
    console.error("Erreur lors de la création de la VM :", err.message);
    res.status(500).send("Erreur interne du serveur.");
  }
});

// Fonction pour installer VSCode et les extensions sur la VM
function installVSCodeAndExtensions(ip, privateKey, extensions) {
  const sshClient = new Client();
  sshClient.on("ready", () => {
    console.log("SSH connecté à la VM.");

    // Installation de VSCode sur une VM Ubuntu/Debian
    const installVSCodeCmd = `
      sudo apt update && sudo apt install -y wget gpg
      wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor > /usr/share/keyrings/microsoft-archive-keyring.gpg
      sudo sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
      sudo apt update
      sudo apt install -y code
    `;

    sshClient.exec(installVSCodeCmd, (err, stream) => {
      if (err) {
        console.error("Erreur lors de l'installation de VSCode:", err);
        return;
      }

      stream.on("close", async () => {
        console.log("VSCode installé.");

        // Installation des extensions VSCode si spécifiées
        if (extensions && extensions.length > 0) {
          const installExtensionsCmd = extensions.map(ext => `code --install-extension ${ext}`).join(' && ');

          sshClient.exec(installExtensionsCmd, (err, stream) => {
            if (err) {
              console.error("Erreur lors de l'installation des extensions:", err);
              return;
            }

            stream.on("close", () => {
              console.log("Extensions VSCode installées.");
              sshClient.end();
            });
          });
        } else {
          sshClient.end();
        }
      });
    });
  }).connect({
    host: ip,
    port: 22,
    username: "ubuntu",
    privateKey: fs.readFileSync("ssh_key.pem")
  });
}

module.exports = router;
