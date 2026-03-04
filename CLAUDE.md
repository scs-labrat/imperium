# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Imperium is an AI-powered offensive and defensive security C2 (Command and Control) framework. It provides tools for red team engagements, threat emulation, and blue team response through a web interface.

## Development Commands

### Backend (runs on port 3001)
```bash
cd backend
npm install
npm start          # Run with tsx
npm run dev        # Run with tsx in watch mode
```

### Frontend (runs on port 3000)
```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
```

### Docker (full stack - port 8080)
```bash
docker-compose up --build
```

Note: Docker is currently broken per README. Use manual setup above.

### Database (Prisma)
```bash
cd backend
npx prisma migrate dev    # Run migrations
npx prisma generate       # Regenerate client
npx prisma studio         # Visual database browser
```

## Architecture

```
imperium/
├── backend/                 # Node.js/Express + TypeScript
│   ├── src/
│   │   ├── index.ts        # Server entry point (Express + Socket.IO)
│   │   ├── socket.ts       # Socket.IO initialization
│   │   ├── controllers/    # Request handlers (aiController, c2Controller, mcpController)
│   │   ├── services/       # Business logic
│   │   │   ├── aiService.ts        # Google Gemini AI integration
│   │   │   ├── c2Service.ts        # Listener/agent/loot CRUD operations
│   │   │   ├── listenerManager.ts  # Network listener lifecycle
│   │   │   └── mcpService.ts       # Model Context Protocol
│   │   ├── routes/         # Express routing (/api/v1)
│   │   └── types/          # TypeScript type definitions
│   └── prisma/
│       ├── schema.prisma   # Database models
│       └── dev.db          # SQLite database
│
├── (frontend - root level)
│   ├── App.tsx             # Main React component
│   ├── index.tsx           # Entry point
│   ├── components/         # React components
│   ├── services/           # API clients (apiService.ts, c2Service.ts)
│   └── types.ts            # Shared type definitions
```

## API Routes

Base path: `/api/v1`

- `/c2` - C2 operations (listeners, agents, loot, SIEM config)
- `/ai` - AI features (code generation, mission planning, detection rules, IR assist)
- `/mcp` - Model Context Protocol integration

## Key Technologies

- **Frontend**: React 19, TypeScript, Vite, Socket.IO client, Axios
- **Backend**: Express, TypeScript, Prisma ORM, Socket.IO
- **Database**: SQLite
- **AI**: Google Generative AI (Gemini) - requires `API_KEY` in `backend/.env`

## Environment Variables

Backend (`backend/.env`):
```
API_KEY=your_google_ai_api_key
DATABASE_URL="file:./dev.db"
```

## Real-time Events (Socket.IO)

Events emitted by backend: `new_agent`, `agent_status_change`, `new_loot`

## Database Models

Key models in `backend/prisma/schema.prisma`:
- `Listener` - Network listeners (HTTP, HTTPS, TCP, SMB)
- `Agent` - Deployed agents with OS/network info
- `Loot` - Collected credentials/files from agents
- `Redirector` - C2 infrastructure redirectors
- `SiemConfig` / `SiemRule` - SIEM integration settings
