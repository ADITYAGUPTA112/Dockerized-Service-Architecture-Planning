output "server_ipv4" {
  description = "Public IPv4 address of the provisioned Ubuntu 24.04 server"
  value       = digitalocean_droplet.service.ipv4_address
}

output "ssh_command" {
  description = "Initial root SSH command before running Ansible or server-setup.sh"
  value       = "ssh root@${digitalocean_droplet.service.ipv4_address}"
}
