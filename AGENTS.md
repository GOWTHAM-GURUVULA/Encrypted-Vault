# AGENTS.md

This repository contains a Windows desktop vault application with two main parts:

- `backend/`: Python/FastAPI service and vault logic
- `frontend/vaultui/`: Electron + React desktop client and Windows packaging scripts

Start with the project documentation in [README.md](README.md) and [frontend/vaultui/README.md](frontend/vaultui/README.md) before making changes.

## Build and run

Use these commands from the repository root or the app folder as noted:

```powershell
cd frontend\vaultui
npm install
npm run electron
```

Useful build commands:

```powershell
cd frontend\vaultui
npm run build
npm run backend:build
npm run electron:build
npm run electron:sign
npm run electron:release:signed
```

Notes:

- The app is Windows-focused and relies on PowerShell scripts and Windows installer packaging.
- `npm run electron:build` validates required release inputs before packaging, including `backend/dist/app.exe` and `electron/vault.ico`.
- Release artifacts are written to `frontend/vaultui/release/`.

## Architecture and ownership

- Keep backend API changes and frontend request payloads in sync; the FastAPI surface lives under `backend/api/` and the desktop client calls it from `frontend/vaultui/src/api/`.
- The bundled backend executable is expected to exist at `backend/dist/app.exe` for packaging and release flows.
- Production signing parameters are environment-driven; do not hardcode secrets or certificate metadata in source-controlled files.

## Repo conventions

- Prefer small, targeted edits that match the existing structure instead of introducing new app layers.
- Validate frontend changes with the Electron/Vite workflow and check packaging requirements before release-oriented edits.
- Treat the docs site under `docs/` as a GitHub Pages promo feed and keep its sample data compatible with the existing JSON layout.
- Keep version numbers and installer expectations consistent when updating the app release.

## Files to inspect first for common work

- [README.md](README.md)
- [frontend/vaultui/README.md](frontend/vaultui/README.md)
- [frontend/vaultui/package.json](frontend/vaultui/package.json)
- [backend/api/Vault_routes.py](backend/api/Vault_routes.py)
- [frontend/vaultui/src/api/vaultApi.js](frontend/vaultui/src/api/vaultApi.js)

## Avoid

- Do not add secret values or certificate credentials directly to repo files.
- Do not assume the app can be built or packaged on non-Windows hosts without the Windows-specific scripts.
- Do not modify release output files in `frontend/vaultui/release/` by hand; they are generated artifacts.
