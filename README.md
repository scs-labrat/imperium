# Imperium C2 - AI-Powered Offensive and Defensive Security Framework

![Imperium Logo](https://i.imgur.com/p0nZfJj.png)

**Imperium** is a next-generation command and control (C2) framework that leverages generative AI to supercharge both offensive and defensive security operations. It provides a comprehensive suite of tools for red team engagements, threat emulation, and blue team response, all managed through a modern, intuitive web interface.

## ✨ Key Features

### 🛡️ Defend Workbench

*   **Defence Planner**: Automatically generate multi-stage security hardening plans based on high-level objectives (e.g., "Harden public web servers").
*   **Threat Hunt**: AI-powered workbench to generate and simulate threat hunting scripts and queries in various languages (PowerShell, KQL, etc.).
*   **SIEM Integration**: Connect to your Elastic SIEM to query data, manage rules, and analyze security events.
*   **Control Validation**: Create and execute structured threat emulation plans to validate the effectiveness of your security controls.
*   **DetectIQ**: An AI-powered detection engineering workbench to generate, optimize, and explain detection rules (Sigma, YARA, Snort).
*   **IR Assist**: Generate step-by-step incident response plans for the ELK stack based on an incident description.
*   **IR Tabletop Scenario Creator**: Create detailed, professional IR tabletop exercise scenarios from a simple threat description.

### 💀 Attack Workbench

*   **AI-Powered Code Generation**: Describe your objective in plain English ("create a reverse shell in Python") and have Imperium's AI generate the exploit code.
*   **Mission Planning**: Decompose high-level objectives (e.g., "achieve domain admin") into a multi-stage attack plan based on the MITRE ATT&CK framework.
*   **Weaponization**: A central workbench to generate, refine, analyze, and obfuscate payloads.
*   **Payload Chainer**: Combine multiple payloads from the vault into a single, cohesive script.
*   **Shellcode Generator**: An integrated `msfvenom` interface to generate shellcode for various platforms and encoders.
*   **Reconnaissance**: Perform OSINT, analyze vulnerability scans (Nessus, Nmap), and parse Spiderfoot JSON data to identify targets and attack vectors.

### 🌐 C2 Operations

*   **Listener Management**: Create and manage network listeners (HTTP, HTTPS, TCP, SMB) that can be bound directly or to redirectors.
*   **Redirector Management**: Set up and manage redirectors for a resilient C2 infrastructure.
*   **Agent Management**: A comprehensive view of all deployed agents, their status, and system information.
*   **Interactive Agent Terminal**: Interact with agents in real-time, execute shell commands, and run built-in modules (credential harvesting, network enumeration, etc.).
*   **Loot Collection**: Automatically collect and view loot (credentials, files, etc.) from compromised agents.

## 🚀 Getting Started

### Prerequisites

*   **Docker** and **Docker Compose**
*   **Node.js** (for running the services directly if not using Docker)
*   A **Google AI API Key**

### Running with Docker (Recommended)

1.  **Create Backend Environment File**:
    In the `backend/` directory, create a file named `.env` and add your Google AI API key:
    ```
    API_KEY=your_google_ai_api_key_here
    ```

2.  **Build and Run Containers**:
    From the root of the project, run the following command:
    ```bash
    docker-compose up --build
    ```

3.  **Access the Application**:
    Open your browser and navigate to `http://localhost:8080`.

4.  **DOCKER IS BROKEN SO.....**
    cd backend
    npm install .
    npm start
    cd ..
    npm install .
    npm run dev

## 🏛️ Architecture

Imperium consists of two main services orchestrated by Docker Compose:

*   **`frontend`**: A React single-page application built with TypeScript and Vite. It is served by a lightweight Nginx container.
*   **`backend`**: A Node.js/Express server that provides the core C2 and AI functionality.
    *   **API**: A RESTful API for all frontend operations.
    *   **AI Service**: Integrates with Google's Generative AI to power code generation, analysis, and planning features.
    *   **C2 Service**: Manages listeners, agents, and loot.
    *   **Listener Manager**: A new service responsible for opening real network ports for listeners and handling incoming agent connections.
    *   **Database**: Uses Prisma with a SQLite database (`dev.db`) to store all application data (listeners, agents, redirectors, logs, etc.).
    *   **Real-time Communication**: Uses Socket.IO to provide real-time updates to the frontend (e.g., new agent check-ins, listener status changes).

<p align="center">
  <img src="https://i.imgur.com/9O0Z8gU.png" alt="Imperium Architecture Diagram" width="800">
</p>

---

***Disclaimer**: Imperium is a tool for professional security researchers and penetration testers. It should only be used in authorized and ethical engagements. The developers are not responsible for any misuse of this framework.*
