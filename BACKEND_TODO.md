# Imperium C2 - Backend TODO

This document outlines the features and improvements required for the real backend server, moving from the current mock implementation to a production-ready C2 framework.

## ✅ Completed Features
- [x] **Database Integration:** Replaced in-memory data store with SQLite using Prisma ORM.
- [x] **Data Models:** Defined Prisma schemas for Redirectors, Listeners, Agents, Loot, and SIEM Config/Rules.
- [x] **Real-time Updates:** Implemented Socket.IO for pushing updates (new agents, status changes, loot) to the frontend.
- [x] **AI Service API:** Fully implemented proxy endpoints for all AI-powered features (code generation, OSINT, mission planning, DetectIQ, etc.) with support for Gemini 2.5 series.
- [x] **SIEM Integration (Mocked Backend):** Added endpoints for SIEM configuration, rule management, and query simulation.
- [x] **C2 API:** Comprehensive API for managing listeners, redirectors, and agent interactions.

---

## 1. Core Architecture & Persistence
- [ ] **Data Models Enhancements:**
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
- [ ] **Export API:** Implement endpoints to export selected loot in various formats (e.g., ZIP archive, JSON).

## 5. Security, Multi-user Support & Settings
- [ ] **Authentication & Authorization:** Implement a secure user authentication system (e.g., JWT, OAuth 2.0) with password hashing and session management.
- [ ] **Role-Based Access Control (RBAC):** Build a persistent and flexible permissions system.
    - [ ] Support granular permissions schema, specifically `ScriptEnginePermissions` which includes `enabled` (boolean) and `allowedAttackTypes` (array of strings).
- [ ] **User Management API:** Create secure CRUD API endpoints for managing users.
- [ ] **Persistent User Settings:** Store user-specific settings (UI preferences, profile details) in the database.
- [ ] **Secure LLM Key Management:** Implement a secure vault (e.g., HashiCorp Vault) or use database-level encryption to store user-provided LLM API keys. The backend must manage these keys and use the appropriate one when making requests to AI providers. **The frontend should never handle or store API keys.**
- [ ] **Audit Logging:** The event log should be a robust, persistent audit trail of all user actions, stored in the database.
- [ ] **Input Validation:** Rigorously validate all API inputs to prevent security vulnerabilities like injection attacks.

## 6. Planning Intelligence
- [ ] **Framework-Aware Planning:** When a plan is requested, the backend should be able to leverage knowledge of specific frameworks (e.g., OWASP WSTG, PTES, PCI-DSS) to generate more relevant and accurate steps.
- [ ] **Framework Knowledge Base:** Implement a service to ingest and parse security framework documents (e.g., from a URI) into a structured knowledge base, allowing the AI to build more sophisticated plans.

## 7. Offensive Infrastructure as Code (IaC)
- [ ] **Secure IaC Execution Environment:** Develop a secure, isolated environment (e.g., using containers) on the backend to run `terraform apply` or `ansible-playbook` commands triggered by the user. This service must handle state files and provide output back to the user.
- [ ] **Secure Overlay Network Orchestration:** The backend must be able to fully automate the deployment of the selected overlay network (e.g., Nebula).
- [ ] **C2 Framework Deployment Automation:** The backend needs scripts to automate the installation and configuration of various C2 frameworks (Cobalt Strike, Sliver, etc.) on the provisioned C2 server VM.
- [ ] **Redirector Provisioning:** Implement provisioning scripts (e.g., Ansible playbooks, shell scripts) to configure reverse proxies (Nginx, Caddy) and traffic forwarders (socat, iptables) on the redirector VMs.