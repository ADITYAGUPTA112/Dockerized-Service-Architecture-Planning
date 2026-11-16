variable "do_token" {
  description = "DigitalOcean API token (supply via TF_VAR_do_token or terraform.tfvars)"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "Ed25519 SSH public key string for initial droplet access"
  type        = string
}

variable "project_name" {
  description = "Droplet and firewall name prefix"
  type        = string
  default     = "dockerized-node-service"
}

variable "region" {
  description = "DigitalOcean datacenter slug"
  type        = string
  default     = "nyc3"
}

variable "droplet_size" {
  description = "Droplet size slug"
  type        = string
  default     = "s-1vcpu-1gb"
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to reach SSH port 22 (restrict to your IP/GitHub runners if desired)"
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "allow_direct_port_3000" {
  description = "Open port 3000 publicly (set false when terminating HTTPS via Caddy on 80/443)"
  type        = bool
  default     = false
}
