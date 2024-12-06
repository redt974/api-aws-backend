const { exec } = require('child_process');
const fs = require('fs').promises;

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
  
  const inventoryContent = `[all]\nec2-${transformedIp}.${process.env.AWS_REGION}.compute.amazonaws.com ansible_user=${vm.ansibleUser} ansible_ssh_private_key_file="${vm.ssh_private_key}"`;

  return fs.writeFile(filePath, inventoryContent.trim())
    .then(() => console.log('Fichier d\'inventaire créé avec succès !'))
    .catch((err) => {
      throw new Error(`Erreur lors de la création du fichier d'inventaire : ${err.message}`);
    });
};

// Fonction pour exécuter le playbook Ansible
const runAnsiblePlaybook = async (inventoryPath, playbook, software, extensions, userEmail, userName, userPassword, instance_id, privateKeyPath, ansibleUser, public_ip) => {
  try {
    // Vérifiez que la VM est prête
    await isVMReady({ public_ip, ansibleUser, ssh_private_key: privateKeyPath });

    // Préparation des variables supplémentaires pour Ansible
    const extraVars = JSON.stringify({
      software_list: software,
      vscode_extensions: extensions,
      user_email: userEmail,
      user_name: userName,
      user_password: userPassword,
      instance_id: instance_id
    });

    // Construction de la commande Ansible avec redirection des logs
    const ansibleCommand = `
      ansible-playbook ${playbook} \\
      -i ${inventoryPath} \\
      --private-key ${privateKeyPath} \\
      --extra-vars '${extraVars}' \\
      -vvv --ssh-common-args="-o StrictHostKeyChecking=no" > ansible_debug.log 2>&1
    `;

    console.log("Exécution de la commande Ansible :\n", ansibleCommand);

    // Exécution du playbook Ansible
    const { stdout, stderr } = await execPromise(ansibleCommand);

    if (stderr) {
      throw new Error(`Erreur lors de l'exécution du playbook Ansible : ${stderr}`);
    }

    console.log(`Sortie Ansible : ${stdout}`);
    return stdout;
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
