# Frontend Integration Guide: Linking to the Real Backend

This document details the changes required in the React frontend to integrate with the production backend server defined in the `PRD.md` and `BACKEND_TODO.md`.

## 1. Environment Configuration

The frontend currently relies on `process.env.API_KEY` for direct Google Gemini calls. This must be replaced with a backend API URL.

**Action Items:**
1.  Create/Update `.env` file:
    ```env
    VITE_API_BASE_URL=http://localhost:3001/api/v1
    # Remove VITE_GEMINI_API_KEY or API_KEY as the frontend should no longer hold secrets.
    ```
2.  Update `vite.config.ts` to expose the `VITE_API_BASE_URL`.

## 2. Authentication & Security

The backend requires JWT authentication for all protected endpoints.

**Action Items:**
1.  **Create `services/authService.ts`:**
    -   Implement `login(username, password)` method that POSTs to `/auth/login`.
    -   Implement secure token storage (e.g., using `localStorage` or `sessionStorage`, or better yet, HTTP-only cookies handled by the browser).
    -   Implement `logout()` to clear tokens.
    -   Implement `getAccessToken()` helper.

2.  **Axios/Fetch Interceptor:**
    -   Configure a global Axios instance (or a fetch wrapper) in `services/apiClient.ts`.
    -   Add a request interceptor to inject the `Authorization: Bearer <token>` header automatically for every request.
    -   Add a response interceptor to handle `401 Unauthorized` responses (trigger logout/redirect to login).

## 3. Refactoring `geminiService.ts` (Critical Security Update)

Currently, the frontend calls the Google Gemini API directly. This exposes the API key. **This logic must be moved to the backend.**

**Action Items:**
1.  **Remove Google GenAI SDK:** Uninstall `@google/genai` from the frontend dependencies if it's no longer needed for client-side logic.
2.  **Update `geminiService.ts`:**
    -   Replace `ai.models.generateContent(...)` calls with HTTP POST requests to backend endpoints.
    -   **Important:** When sending a generation request, include the `attackType` or context. The backend should use this to resolve the appropriate model/key based on the user's `granularLLMConfig` stored in the database, rather than relying on the frontend to dictate the model.
    -   **Example:**
        ```typescript
        // OLD
        // const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });

        // NEW
        const response = await apiClient.post('/ai/generate', {
            prompt: prompt,
            context: 'exploit_generation', 
            attackType: params.attackType, // Backend uses this to pick the user's preferred model
            params: generationParams
        });
        return response.data.text;
        ```
    -   Map all existing functions (`generateExploitCode`, `planMission`, `performOsintAnalysis`, etc.) to specific backend endpoints (e.g., `/api/ai/mission-plan`, `/api/ai/osint`).

## 4. Refactoring `c2Service.ts`

The current service uses in-memory arrays (`agents`, `listeners`, `loot`). These must be replaced with API calls.

### 4.1 Listeners
-   `getListeners()` -> `GET /c2/listeners`
-   `createListener()` -> `POST /c2/listeners`
-   `deleteListener()` -> `DELETE /c2/listeners/:id`
-   `toggleListenerStatus()` -> `PUT /c2/listeners/:id/status`

### 4.2 Redirectors
-   `getRedirectors()` -> `GET /c2/redirectors`
-   `createRedirector()` -> `POST /c2/redirectors`
-   `deleteRedirector()` -> `DELETE /c2/redirectors/:id`

### 4.3 Agents
-   `getAgents()` -> `GET /c2/agents`
-   `getAgent(id)` -> `GET /c2/agents/:id`
-   `executeCommand(id, cmd)` -> `POST /c2/agents/:id/command`
-   **Tasking:** `runTask(id, task)` -> `POST /c2/agents/:id/task`. *Note: The backend is async. The response might be a Task ID, not the result immediately. You may need to poll for the result or wait for a WebSocket event.*

### 4.4 Loot
-   `getLoot()` -> `GET /c2/loot` (Implement pagination/filtering query params)

### 4.5 SIEM
-   `getSiemConfig()` -> `GET /settings/siem`
-   `saveSiemConfig()` -> `PUT /settings/siem`
-   `querySiem()` -> `POST /siem/query` (Proxy request through backend)

### 4.6 Offensive Infrastructure (IaC)
-   The `handlePrepareIacPlan` in `App.tsx` currently sends a prompt to Gemini. This should likely send the configuration to `POST /c2/infrastructure/generate` so the backend can manage the prompt engineering and potential state.

### 4.7 User & Settings Management (New)
The frontend now includes full UI for managing users, profiles, and platform settings.
-   **User Management:**
    -   `getUsers()` -> `GET /users` (Admin only)
    -   `saveUser(user)` -> `POST /users` (Create) or `PUT /users/:id` (Update). Payload must include `permissions` and `granularLLMConfig`.
    -   `deleteUser(id)` -> `DELETE /users/:id`
-   **Profile:**
    -   `updateProfile(user)` -> `PUT /users/me`
-   **Platform Settings:**
    -   `savePlatformSettings(settings)` -> `PUT /settings/platform` (SuperAdmin only). Payload includes `sessionTimeoutMinutes`, `logRetentionDays`, `disabledAttackTypes`.

## 5. Real-Time Updates (WebSockets)

Polling (`setInterval`) is inefficient. Use WebSockets for real-time agent status and logs.

**Action Items:**
1.  **Socket Provider:** Create a `SocketContext` or service to manage the WebSocket connection (using `socket.io-client` or native `WebSocket`).
2.  **Event Listeners:**
    -   Subscribe to `agent:checkin`: Update the agent list/status in Redux/Context when an agent checks in.
    -   Subscribe to `task:complete`: Notify the user (Toast) and update the Loot table when a task finishes.
    -   Subscribe to `log:new`: Append to the live Event Log.
3.  **Update Components:**
    -   Remove the `setInterval` in `App.tsx`.
    -   Update the `useEffect` hooks in `AGENTS` and `EVENT_LOG` views to listen to socket events instead of fetching data periodically.

## 6. Error Handling & Loading States

Network requests can fail. The UI needs to be robust.

**Action Items:**
1.  **Global Error Handler:** Ensure the `apiClient` catches 500/4xx errors and displays a user-friendly Toast notification (already implemented in `App.tsx`, but needs to be hooked into the API service).
2.  **Loading States:** Ensure `isLoading` is set to true before an async API call starts and false when it ends (success or fail).

## 7. Data Types

Ensure the `types.ts` definitions match the backend API response shapes exactly.

**Action Items:**
1.  Review `types.ts` against the backend swagger/OpenAPI documentation (once generated).
2.  Update interfaces if the backend adds fields (e.g., `agent.internalIp`, `loot.hash`).

---
**Summary Checklist:**
- [ ] `.env` updated
- [ ] `authService` created
- [ ] `apiClient` (Axios) configured with interceptors
- [ ] `geminiService.ts` refactored to use backend API
- [ ] `c2Service.ts` refactored to use backend API (including User/Settings endpoints)
- [ ] WebSocket connection established
- [ ] Polling removed
- [ ] Testing of all critical paths (Login -> Plan -> Deploy -> Listen -> Agent Interaction)
