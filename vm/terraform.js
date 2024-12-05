const fs = require("fs");
const { exec } = require("child_process");

function createTerraformConfig(ami, vm_name, outputPath) {
  const config = `
provider "aws" {
  region = "${process.env.AWS_REGION}"
}

resource "tls_private_key" "vm_key" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "aws_key_pair" "key" {
  key_name   = "${vm_name}-key"
  public_key = tls_private_key.vm_key.public_key_openssh
}

resource "aws_instance" "vm" {
  ami               = "${ami}"
  instance_type     = "${process.env.INSTANCE_TYPE}"
  key_name          = aws_key_pair.key.key_name
  vpc_security_group_ids = [aws_security_group.vm_sg.id]  # Association du Security Group
  
  tags = {
    Name = "${vm_name}"
  }
}

output "public_ip" {
  value = aws_instance.vm.public_ip
}

output "instance_id" {
  value = aws_instance.vm.id
}

output "private_key_pem" {
  value     = tls_private_key.vm_key.private_key_pem
  sensitive = true
}

resource "aws_security_group" "vm_sg" {
  name        = "${vm_name}-sg"
  description = "Allow SSH, VNC & RDP access"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  
  }

  ingress {
    from_port   = 5900
    to_port     = 5900
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  
  }

  ingress {
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
`;

  fs.writeFileSync(outputPath, config, "utf8");
}

async function runTerraform(directory) {
  return new Promise((resolve, reject) => {
    exec(
      `cd ${directory} && terraform init && terraform apply -auto-approve`,
      (err, stdout, stderr) => {
        if (err) {
          console.error(`Erreur Terraform : ${stderr}`);
          return reject(err);
        }

        // Utilisation de terraform output -json pour récupérer les données de manière fiable
        exec(
          `cd ${directory} && terraform output -json`,
          (outputErr, outputStdout, outputStderr) => {
            if (outputErr) {
              console.error(`Erreur lors de la récupération des outputs : ${outputStderr}`);
              return reject(outputErr);
            }

            console.log("Terraform output -json:", outputStdout); // Log de la sortie JSON

            try {
              const outputs = JSON.parse(outputStdout);

              // Extraction des valeurs non sensibles
              const public_ip = outputs.public_ip?.value || null;
              const instance_id = outputs.instance_id?.value || null;
              const private_key = outputs.private_key_pem?.value || null;

              if (!public_ip || !instance_id || !private_key) {
                console.error("Erreur : Les sorties Terraform sont incomplètes.");
                return reject(new Error("Erreur dans les sorties Terraform"));
              }

              resolve({ public_ip, instance_id, private_key });
            } catch (parseError) {
              console.error("Erreur lors du parsing des outputs Terraform :", parseError.message);
              reject(parseError);
            }
          }
        );
      }
    );
  });
}

module.exports = { createTerraformConfig, runTerraform };
