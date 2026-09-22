# Encrypted Secure Vault Desktop

Electron + React desktop client for the Encrypted Secure Vault app.

## Development

From this folder:

```powershell
npm install
npm run electron
```

`npm run electron` starts the Electron shell and the source backend.

## Hosted Promos

This app can show your own hosted promos or update cards only when the user is online.

Starter files included:

- `.env.example`
- `public/promos.example.json`

Setup:

1. Copy `.env.example` to `.env`
2. Replace the example URL with your real hosted JSON feed
3. Use `public/promos.example.json` as the template for your feed
4. Restart `npm run electron` for development, or rebuild the app for release

Expected feed format:

```json
{
  "items": [
    {
      "id": "pro",
      "label": "Upgrade",
      "title": "Get Encrypted Secure Vault Pro",
      "body": "Unlock premium features and advanced recovery tools.",
      "cta": "Learn More",
      "url": "https://your-site.com/pro"
    }
  ]
}
```

Behavior:

- promos show only after unlock
- promos show only while online
- if the feed URL is missing or offline, no promo panel is shown
- the login screen never shows promos

## Unsigned Build

To create the normal Windows installer:

```powershell
npm run backend:build
npm run electron:build
```

Output files are written to:

`release/`

`npm run electron:build` validates required release inputs before packaging:
- `backend/dist/app.exe`
- `electron/vault.ico`

If either file is missing, build stops with a clear error instead of creating a broken installer.

## Trusted Signing Release

This project includes a reusable signing script for Microsoft Trusted Signing / Artifact Signing.

Available commands:

```powershell
npm run electron:build
npm run electron:sign
```

Or run the full flow:

```powershell
npm run electron:release:signed
```

## Required Environment Variables

Set these before running `npm run electron:sign`:

```powershell
$env:TRUSTED_SIGNING_SIGNTOOL_PATH="C:\Path\To\signtool.exe"
$env:TRUSTED_SIGNING_DLIB_PATH="C:\Path\To\Azure.CodeSigning.Dlib.dll"
$env:TRUSTED_SIGNING_METADATA_PATH="C:\Path\To\trusted-signing-metadata.json"
```

Optional:

```powershell
$env:TRUSTED_SIGNING_TIMESTAMP_URL="http://timestamp.acs.microsoft.com"
```

The signing script:

- finds the latest `Encrypted Secure Vault Setup *.exe`
- signs that installer
- also signs `release\win-unpacked\Encrypted Secure Vault.exe` when present

## Recommended Release Flow

1. Rebuild the backend executable if backend Python code changed.
2. Build the installer:

```powershell
npm run electron:build
```

3. Sign the installer:

```powershell
npm run electron:sign
```

4. Share only the signed installer from `release/`.

## Notes

- Trusted Signing metadata is managed outside this repo.
- If Windows blocks old builds, always use the latest signed installer.
- Keep version numbers in `package.json` in sync with the installer you share.
- The installer includes uninstall cleanup for `%APPDATA%\encrypted-vault` and legacy vault app-data folders.
