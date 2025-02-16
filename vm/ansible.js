const { exec } = require('child_process');
const fs = require('fs').promises;
const { io } = require("../index.js");

// Fonction pour exécuter une commande en streaming
const execWithProgress = (command, emitProgress) => {
  return new Promise((resolve, reject) => {
    const process = exec(command);

    process.stdout.on('data', (data) => {
      const messages = extractAnsibleTasks(data);
      if (messages.length > 0) {
        emitProgress(messages); // Envoie chaque tâche dès qu'elle apparaît
      }
    });

    process.stderr.on('data', (data) => {
      console.warn(`Ansible Warning/Error: ${data}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Ansible exited with code ${code}`));
      }
    });
  });
};

// Fonction pour exécuter une commande en utilisant des promesses
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Erreur lors de l'exécution de la commande : ${stderr || error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

// Fonction pour vérifier si la VM est prête via SSH
const isVMReady = async (vm, timeout = 30000) => {
  const start = Date.now();
  const sshCommand = `
    ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
    -i "${vm.ssh_private_key}" ${vm.ansibleUser}@ec2-${vm.public_ip.replace(/\./g, '-')}.${process.env.AWS_REGION}.compute.amazonaws.com echo "VM Ready"
  `;

  while (Date.now() - start < timeout) {
    try {
      console.log("Test de connexion SSH à la VM...");
      const { stdout } = await execPromise(sshCommand);
      if (stdout.trim() === "VM Ready") {
        console.log("La VM est prête.");

        // Commande SSH Debug
        console.log(`ssh -i "Downloads\\${vm.user_email}-vm-${vm.instance_id}-id_rsa.pem" ${vm.ansibleUser}@ec2-${vm.public_ip.replace(/\./g, '-')}.${process.env.AWS_REGION}.compute.amazonaws.com`)

        return true;
      }
    } catch (err) {
      console.log("La VM n'est pas encore prête. Nouvelle tentative...");
    }
    await new Promise((r) => setTimeout(r, 5000)); // Attente de 5 secondes avant de réessayer
  }

  throw new Error("La VM n'est pas prête après le délai imparti.");
};

// Fonction pour générer l'inventaire Ansible
const generateAnsibleInventory = (vm, filePath) => {
  // Remplace les points dans l'adresse IP par des tirets
  const transformedIp = vm.public_ip.replace(/\./g, '-');
  
  const inventoryContent = `[vm]\nec2-${transformedIp}.${process.env.AWS_REGION}.compute.amazonaws.com ansible_user=${vm.user_name} ansible_ssh_private_key_file="${vm.ssh_private_key}" ansible_python_interpreter=/usr/bin/python3`;

  return fs.writeFile(filePath, inventoryContent.trim())
    .then(() => console.log("Fichier d'inventaire créé avec succès !"))
    .catch((err) => {
      throw new Error(`Erreur lors de la création du fichier d'inventaire : ${err.message}`);
    });
};

// Fonction pour extraire les tâches Ansible en direct
const extractAnsibleTasks = (output) => {
  return output
    .split("\n")
    .filter(line => line.startsWith("TASK [")) // Filtre les tâches Ansible
    .map(line => line.replace(/TASK \[([^\]]+)\].*/, '$1')) // Nettoie le format
    .join("\n");
};

// Fonction pour exécuter le playbook Ansible
const runAnsiblePlaybook = async (inventoryPath, playbook, software, extensions, user_name, user_email, instance_id, user_password, privateKeyPath, public_ip, emitProgress) => {
  try {
    // Vérifiez que la VM est prête
    await isVMReady({ public_ip, user_name, user_email, instance_id, ssh_private_key: privateKeyPath });

    // Préparation des variables supplémentaires pour Ansible
    const extraVars = JSON.stringify({
      software_list: software,
      vscode_extensions: extensions,
      ansible_user: user_name,
      user_password: user_password,
    });

    // Construction de la commande Ansible avec redirection des logs
    const ansibleCommand = `
      ansible-playbook ${playbook} \\
      -i ${inventoryPath} \\
      --private-key ${privateKeyPath} \\
      --extra-vars '${extraVars}' \\
      -vvv --ssh-common-args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
    `;

    console.log("Exécution du playbook Ansible...");

    // Exécute Ansible et envoie les logs en temps réel
    await execWithProgress(ansibleCommand, emitProgress);

    console.log("Playbook terminé !");
  } catch (err) {
    console.error(`Erreur Ansible : ${err.message}`);
    throw new Error(`Erreur Ansible : ${err.message}`);
  }
};

module.exports = {
  runAnsiblePlaybook,
  generateAnsibleInventory,
  execPromise,
  isVMReady,
};
