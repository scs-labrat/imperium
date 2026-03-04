# Redirector Module - Main Configuration
# Supports: DigitalOcean, AWS, Azure, Vultr, Hetzner

terraform {
  required_version = ">= 1.0.0"
}

locals {
  # VM size mappings per provider
  vm_sizes = {
    digitalocean = {
      small  = "s-1vcpu-1gb"
      medium = "s-2vcpu-2gb"
      large  = "s-4vcpu-8gb"
    }
    aws = {
      small  = "t3.micro"
      medium = "t3.small"
      large  = "t3.medium"
    }
    azure = {
      small  = "Standard_B1s"
      medium = "Standard_B2s"
      large  = "Standard_B4ms"
    }
    vultr = {
      small  = "vc2-1c-1gb"
      medium = "vc2-1c-2gb"
      large  = "vc2-2c-4gb"
    }
    hetzner = {
      small  = "cx11"
      medium = "cx21"
      large  = "cx31"
    }
  }

  # Region mappings (normalize region names)
  regions = {
    digitalocean = {
      nyc    = "nyc1"
      sfo    = "sfo3"
      lon    = "lon1"
      ams    = "ams3"
      fra    = "fra1"
      sgp    = "sgp1"
    }
    aws = {
      nyc    = "us-east-1"
      sfo    = "us-west-2"
      lon    = "eu-west-2"
      ams    = "eu-west-1"
      fra    = "eu-central-1"
      sgp    = "ap-southeast-1"
    }
    azure = {
      nyc    = "eastus"
      sfo    = "westus2"
      lon    = "uksouth"
      ams    = "westeurope"
      fra    = "germanywestcentral"
      sgp    = "southeastasia"
    }
    vultr = {
      nyc    = "ewr"
      sfo    = "lax"
      lon    = "lhr"
      ams    = "ams"
      fra    = "fra"
      sgp    = "sgp"
    }
    hetzner = {
      nyc    = "ash"
      sfo    = "hil"
      lon    = "nbg1"
      ams    = "nbg1"
      fra    = "fsn1"
      sgp    = "sin"
    }
  }

  # Resolve actual size and region
  actual_size   = local.vm_sizes[var.cloud_provider][var.vm_size]
  actual_region = lookup(local.regions[var.cloud_provider], var.region, var.region)
}

# ============================================================================
# DIGITALOCEAN
# ============================================================================

resource "digitalocean_ssh_key" "redirector" {
  count      = var.cloud_provider == "digitalocean" ? 1 : 0
  name       = var.ssh_key_name
  public_key = var.ssh_public_key
}

resource "digitalocean_droplet" "redirector" {
  count    = var.cloud_provider == "digitalocean" ? 1 : 0
  name     = var.name
  size     = local.actual_size
  image    = "ubuntu-22-04-x64"
  region   = local.actual_region
  ssh_keys = [digitalocean_ssh_key.redirector[0].fingerprint]
  tags     = [for k, v in var.tags : "${k}:${v}"]

  connection {
    type        = "ssh"
    user        = "root"
    host        = self.ipv4_address
    private_key = file("~/.ssh/id_rsa")
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y python3 python3-pip",
    ]
  }
}

resource "digitalocean_firewall" "redirector" {
  count       = var.cloud_provider == "digitalocean" ? 1 : 0
  name        = "${var.name}-fw"
  droplet_ids = [digitalocean_droplet.redirector[0].id]

  dynamic "inbound_rule" {
    for_each = var.firewall_rules
    content {
      protocol         = inbound_rule.value.protocol
      port_range       = tostring(inbound_rule.value.port)
      source_addresses = [inbound_rule.value.source]
    }
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# ============================================================================
# HETZNER
# ============================================================================

resource "hcloud_ssh_key" "redirector" {
  count      = var.cloud_provider == "hetzner" ? 1 : 0
  name       = var.ssh_key_name
  public_key = var.ssh_public_key
}

resource "hcloud_server" "redirector" {
  count       = var.cloud_provider == "hetzner" ? 1 : 0
  name        = var.name
  server_type = local.actual_size
  image       = "ubuntu-22.04"
  location    = local.actual_region
  ssh_keys    = [hcloud_ssh_key.redirector[0].id]
  labels      = var.tags

  connection {
    type        = "ssh"
    user        = "root"
    host        = self.ipv4_address
    private_key = file("~/.ssh/id_rsa")
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y python3 python3-pip",
    ]
  }
}

resource "hcloud_firewall" "redirector" {
  count = var.cloud_provider == "hetzner" ? 1 : 0
  name  = "${var.name}-fw"
  labels = var.tags

  dynamic "rule" {
    for_each = var.firewall_rules
    content {
      direction  = "in"
      protocol   = rule.value.protocol
      port       = tostring(rule.value.port)
      source_ips = [rule.value.source]
    }
  }
}

resource "hcloud_firewall_attachment" "redirector" {
  count       = var.cloud_provider == "hetzner" ? 1 : 0
  firewall_id = hcloud_firewall.redirector[0].id
  server_ids  = [hcloud_server.redirector[0].id]
}

# ============================================================================
# VULTR
# ============================================================================

resource "vultr_ssh_key" "redirector" {
  count   = var.cloud_provider == "vultr" ? 1 : 0
  name    = var.ssh_key_name
  ssh_key = var.ssh_public_key
}

resource "vultr_instance" "redirector" {
  count       = var.cloud_provider == "vultr" ? 1 : 0
  label       = var.name
  plan        = local.actual_size
  os_id       = 1743  # Ubuntu 22.04
  region      = local.actual_region
  ssh_key_ids = [vultr_ssh_key.redirector[0].id]
  tags        = [for k, v in var.tags : "${k}:${v}"]

  connection {
    type        = "ssh"
    user        = "root"
    host        = self.main_ip
    private_key = file("~/.ssh/id_rsa")
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y python3 python3-pip",
    ]
  }
}

resource "vultr_firewall_group" "redirector" {
  count       = var.cloud_provider == "vultr" ? 1 : 0
  description = "${var.name} firewall"
}

resource "vultr_firewall_rule" "redirector" {
  count             = var.cloud_provider == "vultr" ? length(var.firewall_rules) : 0
  firewall_group_id = vultr_firewall_group.redirector[0].id
  protocol          = var.firewall_rules[count.index].protocol
  ip_type           = "v4"
  subnet            = split("/", var.firewall_rules[count.index].source)[0]
  subnet_size       = tonumber(split("/", var.firewall_rules[count.index].source)[1])
  port              = tostring(var.firewall_rules[count.index].port)
}

# ============================================================================
# AWS (Simplified)
# ============================================================================

resource "aws_key_pair" "redirector" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  key_name   = var.ssh_key_name
  public_key = var.ssh_public_key
  tags       = var.tags
}

resource "aws_security_group" "redirector" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.name}-sg"
  description = "Security group for ${var.name} redirector"
  tags        = var.tags

  dynamic "ingress" {
    for_each = var.firewall_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = [ingress.value.source]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_ami" "ubuntu" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "redirector" {
  count                  = var.cloud_provider == "aws" ? 1 : 0
  ami                    = data.aws_ami.ubuntu[0].id
  instance_type          = local.actual_size
  key_name               = aws_key_pair.redirector[0].key_name
  vpc_security_group_ids = [aws_security_group.redirector[0].id]
  tags                   = merge(var.tags, { Name = var.name })

  connection {
    type        = "ssh"
    user        = "ubuntu"
    host        = self.public_ip
    private_key = file("~/.ssh/id_rsa")
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y python3 python3-pip",
    ]
  }
}
