provider "aws" {
  region = var.aws_region
}

# Générer une clé SSH dynamiquement
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "dynamic_ssh_key" {
  key_name   = "dynamic-key-${random_string.suffix.id}"
  public_key = tls_private_key.ssh_key.public_key_openssh
}

# Génération d'un suffixe aléatoire pour éviter les conflits de ressources
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Création de la VM
resource "aws_instance" "vm" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = aws_key_pair.dynamic_ssh_key.key_name

  tags = {
    Name = "custom-vm-${random_string.suffix.id}"
  }

  # Ajout du provisioner Ansible
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = var.ssh_user
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
    }

    inline = [
      "ansible-playbook -i ${self.public_ip}, ansible/install-software.yaml --private-key private_key.pem"
    ]
  }
}

output "vm_public_ip" {
  value = aws_instance.vm.public_ip
}

output "private_key" {
  value     = tls_private_key.ssh_key.private_key_pem
  sensitive = true
}

output "key_pair_name" {
  value = aws_key_pair.dynamic_ssh_key.key_name
}
