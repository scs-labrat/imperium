#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dns from 'node:dns/promises';
import net from 'node:net';

// Create server instance
const server = new Server(
  {
    name: "imperium-osint-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool 1: DNS Lookup
 */
async function performDnsLookup(domain: string) {
    try {
        const [a, mx, txt] = await Promise.allSettled([
            dns.resolve4(domain).catch(() => []),
            dns.resolveMx(domain).catch(() => []),
            dns.resolveTxt(domain).catch(() => [])
        ]);

        return {
            a_records: a.status === 'fulfilled' ? a.value : [],
            mx_records: mx.status === 'fulfilled' ? mx.value : [],
            txt_records: txt.status === 'fulfilled' ? txt.value : []
        };
    } catch (error) {
        return { error: `DNS lookup failed: ${error}` };
    }
}

/**
 * Tool 2: Port Scanner (Single Target)
 */
async function checkPort(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000); // 1s timeout
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            resolve(false);
        });
        socket.connect(port, host);
    });
}

async function performPortScan(host: string, ports: number[] = [21, 22, 80, 443, 3389, 8080]) {
    const results: Record<number, string> = {};
    for (const port of ports) {
        const isOpen = await checkPort(host, port);
        results[port] = isOpen ? 'OPEN' : 'CLOSED';
    }
    return results;
}

/**
 * Tool 3: RDAP/WHOIS Lookup (via public API)
 */
async function performWhois(domain: string) {
    try {
        // Using rdap.org as a lightweight proxy for WHOIS data
        const res = await fetch(`https://rdap.org/domain/${domain}`);
        if (!res.ok) throw new Error(`RDAP API returned ${res.status}`);
        const data = await res.json();
        
        // Extract key info to keep context small
        return {
            handle: data.handle,
            events: data.events, // registration/expiration dates
            entities: data.entities?.map((e: any) => e.vcardArray?.[1]) // Contact info if available
        };
    } catch (error) {
        return { error: `WHOIS lookup failed: ${String(error)}` };
    }
}

// --- Handler: List Tools ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "dns_lookup",
        description: "Perform a real DNS lookup to find A, MX, and TXT records.",
        inputSchema: {
          type: "object",
          properties: {
            domain: { type: "string", description: "Target domain name" },
          },
          required: ["domain"],
        },
      },
      {
        name: "port_scan",
        description: "Scan common ports on a target host to identify open services.",
        inputSchema: {
          type: "object",
          properties: {
            host: { type: "string", description: "Target hostname or IP" },
            ports: { 
                type: "array", 
                items: { type: "number" },
                description: "Optional list of ports to scan. Defaults to common ports." 
            },
          },
          required: ["host"],
        },
      },
      {
        name: "whois_lookup",
        description: "Query RDAP/WHOIS data for domain registration details.",
        inputSchema: {
          type: "object",
          properties: {
            domain: { type: "string", description: "Target domain name" },
          },
          required: ["domain"],
        },
      },
    ],
  };
});

// --- Handler: Call Tool ---
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
      let result: any;
      
      switch (name) {
        case "dns_lookup":
            result = await performDnsLookup(String(args?.domain));
            break;
        case "port_scan":
            const ports = Array.isArray(args?.ports) ? args.ports.map(Number) : undefined;
            result = await performPortScan(String(args?.host), ports);
            break;
        case "whois_lookup":
            result = await performWhois(String(args?.domain));
            break;
        default:
            throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };

  } catch (error) {
      return {
        content: [{ type: "text", text: `Error executing tool ${name}: ${error}` }],
        isError: true,
      };
  }
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
