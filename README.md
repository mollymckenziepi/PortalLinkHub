# OC Portal Link Hub Site

A single-page internal site for finding links/guides to the OC portal. Plain
HTML/CSS/JS — no build step, no server required to run it. Shared "Popular
Links" click tracking is powered by a small Google Apps Script + Google
Sheet.

## Structure

```
public/                 the site itself (host this folder)
  index.html
  styles.css
  app.js
  config.js             paste your Apps Script Web App URL here
  data/links.json       all link titles/URLs/categories — edit this to add real links
  assets/logo.png
google-apps-script/
  Code.gs               paste this into script.google.com (see below)
```

## Editing links

Open [public/data/links.json](public/data/links.json). It has two top-level
parts:

- **`resources`** — a flat list of links rendered as the card grid under
  "Resources & Guides" (general resources/guides, one link per card).
- **`sections`** — the "Scribe Links" collapsible tree. Each section can have
  `links` (a flat list) and/or `children` (nested subcategories), recursively
  — this is where the General / Internal > Category 1, Category 2 / External
  structure from the reference mockup lives.

Every link needs a stable, unique `id` — that id is what click counts are
tracked against, so once a link has real traffic, avoid changing its id.

```json
{ "id": "gen-help-desk", "title": "IT Help Desk", "url": "https://..." }
```

The placeholder data currently in the file is just sample content — replace
the titles and URLs with your real ones, and add/remove cards, sections, and
links freely.

## Setting up the Google Sheet backend (for shared Popular Links)

This step is optional — the site works fine without it, "Popular Links" will
just stay empty. Do this once, from your own Google account:

1. Create a new Google Sheet (any name, e.g. "OC Portal Hub Clicks").
2. In the Sheet, go to **Extensions > Apps Script**.
3. Delete the default code in the editor and paste in the contents of
   [google-apps-script/Code.gs](google-apps-script/Code.gs).
4. Click **Deploy > New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Set **Execute as: Me**, and **Who has access: Anyone** (or "Anyone within
   [your organization]" if you're on Google Workspace and want it restricted
   to your org).
7. Click **Deploy**, authorize the permissions it asks for, then copy the
   **Web app URL** it gives you (ends in `/exec`).
8. Paste that URL into [public/config.js](public/config.js) as the value of
   `CLICKS_API_URL`.

The script auto-creates a "Clicks" sheet tab the first time a link is
clicked, with one row per link id and its running count.

## Running it locally

Opening `index.html` directly by double-clicking it (a `file://` URL) will
not work reliably — the browser blocks the fetch of `data/links.json` from
`file://`. Serve it over `http://` even for local testing.

**Easiest: VS Code Live Server extension.** Install "Live Server" (by Ritwick
Dey) from the Extensions panel, then right-click `public/index.html` >
**Open with Live Server**.

**No extensions needed:** run the included PowerShell script, then open
the printed URL in a browser:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

It serves the `public` folder at `http://localhost:8099/`. Stop it with
Ctrl+C in that terminal window.

If you have Node or Python installed, `npx serve public` or
`python -m http.server 8080 --directory public` work too.

## Deploying

Host the contents of `public/` on whatever internal static web host you
normally use (a simple web server, an internal IIS/Apache site, etc.) — there
is nothing to build or install.
