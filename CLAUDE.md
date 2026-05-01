# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm start        # Run production server
```

## Architecture

Next.js 14 App Router SPA for Zen Finance, a Spanish mortgage broker. Clients upload KYC/mortgage documents; the backend creates a Google Drive folder and a Notion database entry.

### Two client flows

1. **`/nuevo`** — New client: 3-step form (Titulares → Inmueble → Documentos) → Processing screen → Done. On submit: creates Drive folder, uploads files with naming convention `TIPODOC_nombre.ext`, creates Notion entry, saves `{dni, folderId, name}` to `localStorage`.

2. **`/expediente`** — Returning client: enters DNI → resolved from `localStorage` first, then Notion API fallback → upload more files to existing Drive folder.

### API routes

- **`POST /api/upload`** — Handles both flows via `mode` form field. For new clients: creates Drive folder (name format: `NOMBRE APELLIDO1 APELLIDO2 - TIPO/ CALLE` in uppercase), uploads files, creates Notion entry. For returning clients: uploads to existing `folderId`. If both DNI front+back are uploaded, `lib/imageUtils.ts` combines them side-by-side into a single JPEG using `sharp`.
- **`GET /api/lookup?dni=`** — Searches Notion DB by DNI, then searches Drive by client name to return `folderId`.

### Key lib files

- `lib/drive.ts` — `createFolder`, `uploadFile` using Google service account from `GOOGLE_SERVICE_ACCOUNT_JSON` env var (full JSON string).
- `lib/notion.ts` — `createClientEntry`, `findClientByDni`. Notion property names must match the DB exactly: `Name` (title), `DNI`, `Teléfono` (phone_number), `Email`, `Área`, `Situación`, `Status` (select).
- `lib/imageUtils.ts` — `combineDniImages(front, back)` → resizes both to same height, composites side-by-side, returns JPEG Buffer.

### Focus loss prevention

`TitularForm` is defined at **module level** (not inside the page component) so React never remounts it on state updates. All form state lives in the parent `NuevoPage` and flows down via props + stable `useCallback` handlers.

## Environment variables

```
GOOGLE_SERVICE_ACCOUNT_JSON=   # Full service account JSON as a single-line string
NOTION_TOKEN=                  # Notion integration token (secret_...)
NOTION_DATABASE_ID=28c2a113-edca-8103-95bf-000b245ffe7c
DRIVE_PARENT_FOLDER_ID=1YL8BmtlOKCOC6MeAd-F6BIlPAnuYwBs5
```

The service account must have Drive access to the parent folder (share the folder with the service account email).

## Brand tokens

| Token | Value |
|-------|-------|
| Navy blue | `#0f3693` |
| Salmon pink | `#ffbeb8` |
| Font | Prompt (Google Fonts, loaded via `<link>` in layout) |

Use Tailwind arbitrary values (`bg-[#0f3693]`) — `navy` and `salmon` are also extended in `tailwind.config.ts`.
