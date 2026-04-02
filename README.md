# Encrypted Vault

Encrypted Vault is a Windows desktop app for storing files inside a local encrypted vault. The app uses an Electron + React frontend and a bundled Python backend.

## Features

- local encrypted vault workflow
- password unlock and recovery-key unlock
- add, open, restore, and delete file actions
- automatic file categorization with category view
- drag-and-drop file adding
- optional online-only hosted promo panel

## Project Layout

- `backend/` - FastAPI app, vault logic, and packaged backend executable input
- `frontend/vaultui/` - Electron desktop client, React UI, release scripts, and Windows installer output

## Development

```powershell
cd frontend\vaultui
npm install
npm run electron
```

## Windows Build

```powershell
cd frontend\vaultui
npm run electron:build
```

The generated installer is written to `frontend/vaultui/release/`.

## Release Documents

- [Desktop README](frontend/vaultui/README.md)
- [Privacy Policy](PRIVACY_POLICY.md)

## GitHub Pages Promo Feed

This repo is prepared to host live promo ads with GitHub Pages from the `docs/` folder.

- feed file: `docs/promos.json`
- landing page: `docs/index.html`
- sample banner assets: `docs/banners/`

Expected GitHub Pages URL for this repo:

`https://gowtham-guruvula.github.io/Encrypted-Vault/promos.json`

## Publishing Notes

- share the latest installer from `frontend/vaultui/release/`
- prefer signing the installer before public distribution
- keep real `.env` values local and out of source control
