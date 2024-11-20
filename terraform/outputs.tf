output "public_ip" {
  description = "Adresse IP publique de la VM"
  value       = aws_instance.vm.public_ip
}

output "ssh_private_key" {
  description = "Clé privée SSH générée dynamiquement"
  value       = tls_private_key.ssh_key.private_key_pem
  sensitive   = true
}

output "key_pair_name" {
  description = "Nom de la paire de clés AWS utilisée"
  value       = aws_key_pair.dynamic_ssh_key.key_name
}
