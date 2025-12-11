

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// --- In-memory Database ---
let listeners = [
    { id: 'l1', name: 'HTTP-80', type: 'HTTP', host: '0.0.0.0', port: 80, status: 'active' },
    { id: 'l2', name: 'HTTPS-443', type: 'HTTPS', host: '0.0.0.0', port: 443, status: 'inactive' },
    { id: 'l3', name: 'SMB-Pipe', type: 'SMB', host: 'imperium.c2', port: 445, status: 'active' },
];
let agents = [
    { 
        id: 'a1', os: 'windows', osVersion: 'Windows 10 Pro', hostname: 'DESKTOP-R7T5J6B', user: 'john.doe', 
        ip: '192.168.1.101', externalIp: '8.8.8.8', lastSeen: new Date(Date.now() - 5000).toISOString(), 
        firstSeen: new Date(Date.now() - 3600000).toISOString(), status: 'active', listener: 'HTTP-80', 
        pid: 1234, processName: 'svchost.exe'
    },
    { 
        id: 'a2', os: 'linux', osVersion: 'Ubuntu 22.04', hostname: 'web-server-01', user: 'www-data', 
        ip: '10.0.2.15', externalIp: '8.8.4.4', lastSeen: new Date(Date.now() - 120000).toISOString(), 
        firstSeen: new Date(Date.now() - 7200000).toISOString(), status: 'stale', listener: 'HTTPS-443',
        pid: 5678, processName: '/usr/sbin/apache2'
    },
];
let loot = [
    { id: 'loot1', agentId: 'a1', type: 'credential', source: 'mimikatz', content: 'user:j.doe, pass:Password123!', timestamp: new Date().toISOString() },
    { id: 'loot2', agentId: 'a2', type: 'file', source: '/etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash...', timestamp: new Date().toISOString() },
];
let siemConfig = {
    url: '',
    apiKey: '',
    connected: false,
};
let nextListenerId = 4;
let nextAgentId = 3;
let nextLootId = 3;

// --- Helper Functions ---
const generateRandomIp = () => `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
const generateHostname = (os) => os === 'windows' ? `DESKTOP-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : `server-${Math.random().toString(36).substring(2, 6)}`;
const generateUser = (os) => os === 'windows' ? 'SYSTEM' : 'root';


// --- Routes ---

// Listeners
app.get('/listeners', (req, res) => {
    res.json(listeners);
});

app.post('/listeners', (req, res) => {
    const newListener = {
        id: `l${nextListenerId++}`,
        ...req.body,
        status: 'inactive'
    };
    listeners.push(newListener);
    res.status(201).json(newListener);
});

app.delete('/listeners/:id', (req, res) => {
    listeners = listeners.filter(l => l.id !== req.params.id);
    res.status(204).send();
});

app.put('/listeners/:id/status', (req, res) => {
    const { status } = req.body;
    const listener = listeners.find(l => l.id === req.params.id);
    if (listener) {
        listener.status = status;
        res.json(listener);
    } else {
        res.status(404).send('Listener not found');
    }
});

// Agents
app.get('/agents', (req, res) => {
    // Simulate status changes
    agents.forEach(agent => {
        const timeSinceSeen = Date.now() - new Date(agent.lastSeen).getTime();
        if (timeSinceSeen > 300000) agent.status = 'dead';
        else if (timeSinceSeen > 60000) agent.status = 'stale';
        else agent.status = 'active';
    });
    res.json(agents);
});

app.get('/agents/:id', (req, res) => {
    const agent = agents.find(a => a.id === req.params.id);
    if (agent) {
        res.json(agent);
    } else {
        res.status(404).send('Agent not found');
    }
});

app.post('/agents/simulate', (req, res) => {
    const { listenerId, os } = req.body;
    const listener = listeners.find(l => l.id === listenerId);
    if (!listener) {
        return res.status(400).send('Invalid listener ID');
    }

    const now = new Date().toISOString();
    const newAgent = {
        id: `a${nextAgentId++}`,
        os,
        osVersion: os === 'windows' ? 'Windows 11 Pro' : 'Ubuntu 22.04 LTS',
        hostname: generateHostname(os),
        user: generateUser(os),
        ip: generateRandomIp(),
        externalIp: '1.2.3.4',
        lastSeen: now,
        firstSeen: now,
        status: 'active',
        listener: listener.name,
        pid: Math.floor(Math.random() * 20000) + 1000,
        processName: os === 'windows' ? 'powershell.exe' : '/bin/bash'
    };
    agents.push(newAgent);
    res.status(201).json(newAgent);
});

app.post('/agents/:id/execute', (req, res) => {
    const { command } = req.body;
    const agent = agents.find(a => a.id === req.params.id);
    if (!agent) {
        return res.status(404).send('Agent not found');
    }

    let output = '';
    if (agent.os === 'windows') {
        if (command.toLowerCase() === 'whoami') {
            output = `${agent.hostname}\\${agent.user}`;
        } else if (command.toLowerCase().startsWith('dir')) {
            output = `
 Volume in drive C has no label.
 Volume Serial Number is 1234-ABCD

 Directory of C:\\Users\\${agent.user}

01/01/2023  12:00 PM    <DIR>          .
01/01/2023  12:00 PM    <DIR>          ..
01/01/2023  12:01 PM    <DIR>          Documents
01/01/2023  12:02 PM    <DIR>          Downloads
01/01/2023  12:03 PM    <DIR>          Desktop
               0 File(s)              0 bytes
               5 Dir(s)  123,456,789,012 bytes free`;
        } else {
            output = `'${command}' is not recognized as an internal or external command,\noperable program or batch file.`;
        }
    } else { // linux/macos
        if (command.toLowerCase() === 'whoami') {
            output = agent.user;
        } else if (command.toLowerCase() === 'id') {
            output = `uid=1000(${agent.user}) gid=1000(${agent.user}) groups=1000(${agent.user})`;
        } else if (command.toLowerCase().startsWith('ls')) {
            output = 'Documents  Downloads  Music  Pictures  Videos';
        } else {
            output = `${command}: command not found`;
        }
    }
    res.json({ output });
});

app.post('/agents/:id/tasks', (req, res) => {
    const { task } = req.body;
    const agent = agents.find(a => a.id === req.params.id);
     if (!agent) {
        return res.status(404).send('Agent not found');
    }
    let newLootItem;
    if (task === 'credential_harvesting') {
        newLootItem = {
            id: `loot${nextLootId++}`,
            agentId: agent.id,
            type: 'credential',
            source: 'lsass.exe dump',
            content: `SAM Account: ${agent.user} NTLM: 1a2b3c4d...`,
            timestamp: new Date().toISOString()
        };
    } else if (task === 'network_scan') {
        newLootItem = {
            id: `loot${nextLootId++}`,
            agentId: agent.id,
            type: 'file',
            source: 'internal_scan.txt',
            content: `Scan results for 192.168.1.0/24:\n192.168.1.1 - Gateway\n192.168.1.105 - Open ports: 80, 443`,
            timestamp: new Date().toISOString()
        };
    } else {
        return res.status(400).send('Unknown task');
    }
    loot.push(newLootItem);
    res.status(201).json(newLootItem);
});

// Loot
app.get('/loot', (req, res) => {
    res.json(loot);
});

// SIEM Config
app.get('/siem/config', (req, res) => {
    res.json(siemConfig);
});

app.post('/siem/config', (req, res) => {
    const { url, apiKey, connected } = req.body;
    siemConfig = { url, apiKey, connected };
    res.json(siemConfig);
});

app.post('/siem/test', (req, res) => {
    const { url, apiKey } = req.body;
    if (url && apiKey && url.startsWith('http') && apiKey.length > 10) {
        // Simulate a successful connection
        res.json({ success: true, message: 'Successfully connected to Elastic SIEM.' });
    } else {
        res.status(400).json({ success: false, message: 'Connection failed. Please check URL and API Key.' });
    }
});


app.listen(PORT, () => {
    console.log(`Imperium C2 mock server running on http://localhost:${PORT}`);
});
