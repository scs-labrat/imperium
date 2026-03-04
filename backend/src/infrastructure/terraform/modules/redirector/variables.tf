# Redirector Module Variables

variable "name" {
  description = "Name of the redirector"
  type        = string
}

variable "cloud_provider" {
  description = "Cloud provider to deploy to"
  type        = string
  validation {
    condition     = contains(["digitalocean", "aws", "azure", "vultr", "hetzner"], var.cloud_provider)
    error_message = "Cloud provider must be one of: digitalocean, aws, azure, vultr, hetzner"
  }
}

variable "region" {
  description = "Region to deploy the redirector"
  type        = string
}

variable "vm_size" {
  description = "Size of the VM"
  type        = string
  default     = "small"
  validation {
    condition     = contains(["small", "medium", "large"], var.vm_size)
    error_message = "VM size must be one of: small, medium, large"
  }
}

variable "ssh_public_key" {
  description = "SSH public key for access"
  type        = string
}

variable "ssh_key_name" {
  description = "Name for the SSH key resource"
  type        = string
  default     = "imperium-redirector"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    managed_by = "imperium"
    purpose    = "redirector"
  }
}

variable "firewall_rules" {
  description = "Firewall rules for the redirector"
  type = list(object({
    port     = number
    protocol = string
    source   = string
  }))
  default = [
    { port = 22, protocol = "tcp", source = "0.0.0.0/0" },
    { port = 80, protocol = "tcp", source = "0.0.0.0/0" },
    { port = 443, protocol = "tcp", source = "0.0.0.0/0" },
    { port = 4242, protocol = "udp", source = "0.0.0.0/0" },  # Nebula
    { port = 51820, protocol = "udp", source = "0.0.0.0/0" }, # WireGuard
  ]
}

# Cloud-specific variables
variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_access_key" {
  description = "AWS Access Key ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS Secret Access Key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  default     = ""
}

variable "azure_client_id" {
  description = "Azure Client ID"
  type        = string
  default     = ""
}

variable "azure_client_secret" {
  description = "Azure Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure Tenant ID"
  type        = string
  default     = ""
}

variable "vultr_api_key" {
  description = "Vultr API Key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "hetzner_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  default     = ""
  sensitive   = true
}
