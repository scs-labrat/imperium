# Imperium C2 - Backend TODO

This document outlines the features and improvements required for the real backend server, moving from the current mock implementation to a production-ready C2 framework.

## 1. Core Architecture & Persistence
- [ ] **Database Integration:** Replace the in-memory data store with a robust database (e.g., PostgreSQL, MongoDB).
- [ ] **Data Models:** Define proper schemas/models for all platform entities.
    - [ ] **Redirector:** `id`, `name`, `ip`, `type`, `tier`, `status`, health check info.
    - [ ] **Listener:** `id`, `name`, `type`, `host`, `port`, `status`. Must support `redirectorId` for binding, and fields for advanced options (`jitterMin`, `jitterMax`, `hostHeader`, `profile`, etc.).
    - [ ] **Agent:** `id`, `os`, `hostname`, `user`. Add `privileges`, `internalIp`, `externalIp`, `processInjectionTarget`, and other detailed metadata.
    - [ ] **Loot:** `id`, `agentId`, `type`, `source`. Add metadata enrichment fields: `confidence`, `sourcePath`, `timestamp`.
    - [ ] **Vault Item:** The database model for vault items must include a 'team' field (e.g., string: 'RED' or 'BLUE') to distinguish between offensive payloads and defensive scripts.
    - [ ] **User:** Schema must support `platformLLMConfig` (default provider/model) and `granularLLMConfig` (JSON map of AttackType -> Model Config).
- [ ] **Configuration Management:** Implement a secure way to manage server configuration (e.g., database connection strings, secret keys) instead of hardcoding.
- [ ] **Asynchronous Task Queue:** Implement a task queue (e.g., RabbitMQ, Redis) for handling agent tasking and processing results without blocking the main API thread.

## 2. Agent Communication & C2 Logic
- [ ] **Real Listener Implementation:** Implement the actual networking logic for each listener type (HTTP/S, DNS, mTLS, TCP/Reverse TCP, SMB, QUIC). This involves handling agent check-ins, tasking, and receiving output.
    - [ ] Support binding listeners to specific redirectors or directly to the C2's network interface.
    - [ ] Implement advanced configuration options: Jitter, retry strategies, sleep masks, host header/domain fronting, and profile rotation (JA3, User-Agent).
- [ ] **Redirector Logic:**
    - [ ] Implement health checks to monitor redirector status (latency, drops).
    - [ ] Backend logic to manage traffic forwarding rules (path filtering, header rewriting) for proxies like Nginx.
    - [ ] API to manage redirector lifecycle (create, update, destroy).
- [ ] **Agent Tasking & Modules:**
    - [ ] Implement a robust async tasking system via the task queue.
    - [ ] Develop backend modules to perform built-in tasks (credential harvesting, file system enumeration, network pivoting, privesc checks). These modules will generate the low-level commands sent to the agent.
- [ ] **Encrypted C2 Channel:** All communication between agents and the C2 server must be encrypted and authenticated (e.g., using TLS with mutual authentication, or a custom EKE protocol).
- [ ] **Real-time Updates:** Implement WebSockets or Server-Sent Events to push real-time updates to the frontend (e.g., new agents, new loot, task completion) instead of relying on polling.

## 3. Agent Builder & Payload Generation
- [ ] **Agent Generation Service:** The backend should be responsible for compiling or generating the agent payloads based on user configuration.
    - [ ] Support multiple payload types (EXE, DLL, shellcode, PowerShell, Python, etc.).
    - [ ] Implement logic to embed configuration (listener info, keys) into the agent.
    - [ ] Integrate evasion options: AMSI/ETW bypass stubs, configuration encryption, etc.
    - [ ] Handle staged vs. stageless payload generation.
    - [ ] Add persistence modules that can be optionally compiled in.
- [ ] **Shellcode Generation Integration:** Integrate with a real shellcode generation engine or tool (like Metasploit Framework) instead of relying on AI to generate it. This ensures reliability and correctness.
- [ ] **Packer/Loader Service:** Implement the backend logic to apply packing and loading techniques to generated payloads.

## 4. Loot Management
- [ ] **Loot Processing Pipeline:** Create a backend service that runs on new loot items. It should automatically categorize the content (e.g., identify password hashes, keys, etc.).
- [ ] **Metadata Enrichment:** Automatically tag loot with agent info, timestamp, and source task when it's received.
- [ ] **Search & Filtering API:** Build a powerful API to allow the frontend to search and filter the loot database by any metadata field.
- [ ] **Export API:** Implement endpoints to export selected loot in various formats (e.g., ZIP archive, JSON).

## 5. Security, Multi-user Support & Settings
- [ ] **Authentication & Authorization:** Implement a secure user authentication system (e.g., JWT, OAuth 2.0) with password hashing and session management.
- [ ] **Role-Based Access Control (RBAC):** Build a persistent and flexible permissions system.
    - [ ] Support standard roles: `SuperAdmin`, `Admin`, `User`.
    - [ ] Support granular permissions schema, specifically `ScriptEnginePermissions` which includes `enabled` (boolean) and `allowedAttackTypes` (array of strings).
- [ ] **User Management API:** Create secure CRUD API endpoints for managing users.
    - [ ] Endpoints to assign roles and permissions.
    - [ ] Endpoints to update user-specific `platformLLMConfig` and `granularLLMConfig`.
- [ ] **Persistent User Settings:** Store user-specific settings (UI preferences, profile details) in the database.
- [ ] **Platform Settings API:** Create endpoints for SuperAdmins to manage platform-wide settings.
    - [ ] **Global LLM Defaults:** Default provider and model for new users.
    - [ ] **Security Policies:** Persist `sessionTimeoutMinutes` and `logRetentionDays`.
    - [ ] **Feature Flags:** Persist `disabledAttackTypes` (global blocklist).
    - [ ] **Access Control:** Ensure only SuperAdmins can access these endpoints.
- [ ] **Secure LLM Key Management:** Implement a secure vault (e.g., HashiCorp Vault) or use database-level encryption to store user-provided LLM API keys. The backend must manage these keys and use the appropriate one when making requests to AI providers. **The frontend should never handle or store API keys.**
- [ ] **Audit Logging:** The event log should be a robust, persistent audit trail of all user actions, stored in the database.
- [ ] **Input Validation:** Rigorously validate all API inputs to prevent security vulnerabilities like injection attacks.

## 6. Planning Intelligence
- [ ] **Offensive Mission Planning:** Backend endpoint for `planMission` to generate multi-stage attack plans based on the MITRE ATT&CK framework.
- [ ] **Defensive Mission Planning:** Backend endpoint for `planDefenceMission` to generate security hardening plans.
- [ ] **Control Validation Planning:** Backend endpoint for `generateValidationPlan` to create threat emulation plans for testing security controls.
- [ ] **Framework-Aware Planning:** When a plan is requested, the backend should be able to leverage knowledge of specific frameworks (e.g., OWASP WSTG, PTES, PCI-DSS) to generate more relevant and accurate steps.
- [ ] **Framework Knowledge Base:** Implement a service to ingest and parse security framework documents (e.g., from a URI) into a structured knowledge base, allowing the AI to build more sophisticated plans.

## 7. Offensive Infrastructure as Code (IaC)
- [ ] **Endpoint for IaC Generation:** Create an API endpoint that accepts the detailed infrastructure plan (C2 type, cloud provider, redirectors, overlay network config) generated on the frontend and uses the LLM to generate the IaC script (Terraform/Ansible).
- [ ] **Handle "Imperium as C2" Scenario:** The IaC generation logic must recognize when Imperium is the selected C2 and generate scripts ONLY for the redirector and networking infrastructure, excluding a dedicated C2 server VM.
- [ ] **Cloud Provider Credential Management:** Implement a secure way to store and use cloud provider API keys (e.g., using HashiCorp Vault). The backend must be able to use these credentials to interact with provider APIs.
- [ ] **Secure IaC Execution Environment:** Develop a secure, isolated environment (e.g., using containers) on the backend to run `terraform apply` or `ansible-playbook` commands triggered by the user. This service must handle state files and provide output back to the user.
- [ ] **Secure Overlay Network Orchestration:** The backend must be able to fully automate the deployment of the selected overlay network (e.g., Nebula). This includes:
    - [ ] Generating the Certificate Authority (CA).
    - [ ] Generating unique certificates and keys for each node.
    - [ ] Securely distributing the credentials and configuration files to each provisioned VM.
    - [ ] Configuring the firewall and ACL rules for the overlay network.
- [ ] **C2 Framework Deployment Automation:** The backend needs scripts to automate the installation and configuration of various C2 frameworks (Cobalt Strike, Sliver, etc.) on the provisioned C2 server VM. This includes transferring malleable profiles and setting up listeners on the correct (overlay) network interface.
- [ ] **Redirector Provisioning:** Implement provisioning scripts (e.g., Ansible playbooks, shell scripts) to configure reverse proxies (Nginx, Caddy) and traffic forwarders (socat, iptables) on the redirector VMs.

## 8. Defensive & Blue Team Capabilities
- [ ] **Threat Hunting Workbench**
    - [ ] **Endpoint for `generateThreatHuntCode`:** Generate defensive scripts (PowerShell, KQL, etc.) based on a hunting objective.
    - [ ] **Endpoint for `analyzeThreatHuntLog`:** A specialized analysis endpoint that instructs the LLM to focus ONLY on **effectiveness** and **resilience**, not stealth. Must be able to return structured JSON with categories and suggestions.
    - [ ] **Endpoint for `applyAnalysisRecommendations`:** Refactor a script based on a set of selected recommendations.

- [ ] **SIEM & Detection Engineering (DetectIQ)**
    - [ ] **Endpoint for `generateDetectionRule`:** Ingest a natural language description and generate a rule (Sigma, YARA, Snort). Must handle JSON schema responses and optional SIEM query translation.
    - [ ] **Endpoint for `optimizeDetectionRule`:** Ingest an existing rule and return an optimized version with an explanation. Must handle JSON schema responses.
    - [ ] **Endpoint for `explainDetectionRule`:** Ingest a rule and return a natural language explanation. Must handle JSON schema responses.

- [ ] **Incident Response (IR Assist)**
    - [ ] **Endpoint for `generateIrPlan`:** Ingest an incident description and generate a multi-stage investigation plan with KQL queries.
    - [ ] **Endpoint for `convertKqlToDsl`:** Convert a KQL query into an Elasticsearch DSL JSON object.
    - [ ] **Endpoint for `analyzeSiemResponse`:** Ingest raw JSON from a SIEM query and provide a natural language summary of the findings.

- [ ] **SIEM Management**
    - [ ] **Persistent SIEM Configuration:** Move the SIEM connection settings from the mock service to a secure, persistent database table.
    - [ ] **Persistent Detection Rules:** Store SIEM detection rules in the database.
    - [ ] **CRUD API for Rules:** Implement API endpoints to create, read, update (e.g., toggle enabled/disabled), and delete SIEM detection rules.
