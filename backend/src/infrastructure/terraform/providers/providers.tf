# Provider Configurations for Redirector Deployment
# This file is generated dynamically based on the selected cloud provider

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.0"
    }
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Provider configurations will be set via environment variables or passed credentials
# DO_TOKEN, HCLOUD_TOKEN, VULTR_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.

provider "digitalocean" {
  # Token set via DO_TOKEN environment variable
}

provider "hcloud" {
  # Token set via HCLOUD_TOKEN environment variable
}

provider "vultr" {
  # API key set via VULTR_API_KEY environment variable
}

provider "aws" {
  # Credentials set via AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  # Region set via AWS_DEFAULT_REGION or passed as variable
}

provider "azurerm" {
  features {}
  # Credentials set via ARM_* environment variables
}
