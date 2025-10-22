# Piggy Bank App Frontend

This is a minimal Vue 3 + Vite frontend scaffold for the Piggy Bank project.

Backend API base: http://localhost:8000/api

Quick start (PowerShell):

```powershell
# install dependencies
npm install

# start dev server (open http://localhost:3000)
npm run dev
```

Notes:
- The dev server proxies requests starting with `/api` to `http://localhost:8000` as configured in `vite.config.js`.
- The demo component `src/components/HelloWorld.vue` calls POST `/api/ProgressTracking/_getPlans` with a dummy user payload.
