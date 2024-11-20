variable "aws_region" {
  description = "Région AWS où créer la VM"
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "ID de l'AMI à utiliser"
  type        = string
}

variable "instance_type" {
  description = "Type d'instance AWS (ex : t2.micro)"
  type        = string
  default     = "t2.micro"
}

variable "ssh_user" {
  description = "Utilisateur SSH par défaut pour la connexion"
  type        = string
  default     = "ubuntu"
}
