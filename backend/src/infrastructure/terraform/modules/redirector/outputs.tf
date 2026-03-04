# Redirector Module Outputs

output "public_ip" {
  description = "Public IP address of the redirector"
  value = coalesce(
    try(digitalocean_droplet.redirector[0].ipv4_address, null),
    try(hcloud_server.redirector[0].ipv4_address, null),
    try(vultr_instance.redirector[0].main_ip, null),
    try(aws_instance.redirector[0].public_ip, null),
    ""
  )
}

output "private_ip" {
  description = "Private IP address of the redirector"
  value = coalesce(
    try(digitalocean_droplet.redirector[0].ipv4_address_private, null),
    try(hcloud_server.redirector[0].ipv4_address, null),  # Hetzner uses same IP
    try(vultr_instance.redirector[0].internal_ip, null),
    try(aws_instance.redirector[0].private_ip, null),
    ""
  )
}

output "instance_id" {
  description = "Instance ID of the redirector"
  value = coalesce(
    try(tostring(digitalocean_droplet.redirector[0].id), null),
    try(tostring(hcloud_server.redirector[0].id), null),
    try(vultr_instance.redirector[0].id, null),
    try(aws_instance.redirector[0].id, null),
    ""
  )
}

output "ssh_user" {
  description = "SSH user for the redirector"
  value = var.cloud_provider == "aws" ? "ubuntu" : "root"
}

output "cloud_provider" {
  description = "Cloud provider used"
  value = var.cloud_provider
}

output "region" {
  description = "Region where redirector is deployed"
  value = local.actual_region
}

output "name" {
  description = "Name of the redirector"
  value = var.name
}
