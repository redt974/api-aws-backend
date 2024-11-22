const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

function createTerraformConfig(ami, vmName, publicKey, outputPath) {
  const config = `
provider "aws" {
  region = "${process.env.AWS_REGION}"
}
resource "aws_instance" "vm" {
  ami           = "${ami}"
  instance_type = "${process.env.INSTANCE_TYPE}"
  key_name      = "${vmName}-key"
  tags = {
    Name = "${vmName}"
  }
}
resource "aws_key_pair" "key" {
  key_name   = "${vmName}-key"
  public_key = <<EOF
${fs.readFileSync(publicKey).toString()}
EOF
}
output "public_ip" {
  value = aws_instance.vm.public_ip
}
output "instance_id" {
  value = aws_instance.vm.id
}
`;
  fs.writeFileSync(outputPath, config);
}

async function runTerraform(directory) {
  return new Promise((resolve, reject) => {
    exec(`cd ${directory} && terraform init && terraform apply -auto-approve`, (err, stdout) => {
      if (err) {
        console.error(`Erreur Terraform : ${err.message}`);
        return reject(err);
      }
      const ipMatch = stdout.match(/public_ip = "(.*)"/);
      const publicIp = ipMatch ? ipMatch[1] : null;

      const instanceIdMatch = stdout.match(/instance_id = "(.*)"/);
      const instanceId = instanceIdMatch ? instanceId[1] : null;

      if (!publicIp || !instanceId) reject(new Error("Erreur dans les sorties Terraform"));
      resolve({ publicIp, instanceId });
    });
  });
}

module.exports = { createTerraformConfig, runTerraform };
