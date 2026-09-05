# mzkjack.com

Personal website of Minjoon Jack Kim. Static HTML, no build step, hosted on GitHub Pages.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The site. Renders everything from `content.js`. |
| `content.js` | All text on the site: profile, tabs, sections. Edit this to change content. |
| `admin.html` | Password-protected editor with live preview. Publishes straight to GitHub. |
| `admin.js`, `admin-core.js` | Editor logic. |
| `admin-config.js` | Repo name plus your encrypted GitHub token (written by the editor on first setup). |
| `images/profile.jpg` | Your portrait. Add it; the site shows a placeholder until it exists. |
| `media/YYYY-MM/…` | Photos and videos attached to posts. Created by the editor when you post. |
| `CNAME` | Custom domain for GitHub Pages. |

## Editing content

**Option A: the editor.** Click **Edit** in the site footer (or open `https://mzkjack.com/admin.html`) and enter your password. The editor has two modes:

- **Compose** — a social-post screen. Pick which tab to post in, add a title and body, drag in (or paste, or browse for) as many photos and videos as you like, then hit **Post**. The files upload to the repo and the post goes live in one step. Existing posts are listed underneath, with Edit, Delete and reorder.
- **Structure** — the full form for everything else on the page (profile, experience, tables, skills…), with a live preview on the right. Edit, then click **Publish**.

Either way the site updates within about a minute; freshly uploaded photos and videos appear once GitHub Pages finishes rebuilding.

**Option B: by hand.** Edit `content.js` in any text editor and push. Text fields accept `**bold**` and line breaks.

Section types available in `content.js` (and in the editor's "Add section" menu):

- `text` — a title and paragraphs
- `entries` — jobs, degrees, activities (heading, org, location, dates, bullets)
- `table` — name / description / small tag rows (projects, certifications)
- `skills` — label / chips rows
- `stats` — three big numbers with labels
- `cards` — a two-column grid of small cards with facts
- `posts` — a feed of dated posts with a title, body and any number of photos or videos. Every tab starts with one; the Compose mode writes into it.

Post bodies accept `**bold**`, a blank line starts a new paragraph, and bare URLs become links. Photos and videos open in a full-screen viewer when clicked.

## First-time editor setup

1. Create a GitHub fine-grained token at https://github.com/settings/personal-access-tokens/new
   - Repository access: **Only select repositories** → this repo
   - Permissions → Repository → **Contents: Read and write**
2. Open `admin.html` on the live site (or on `localhost`, see below). It shows **First-time setup**.
3. Paste the token, choose a password (8+ characters, longer is safer), submit.

The editor encrypts the token with your password (PBKDF2, 600k iterations, AES-256-GCM) and commits the encrypted blob to `admin-config.js`. The password is never stored. To rotate the token or reset the password, click **Reset access…** on the lock screen and repeat setup with a new token.

The editor needs `https://` or `localhost` for the browser's crypto API. Locally, run:

```
python3 -m http.server 8000
```

and open http://localhost:8000/admin.html.

## Security notes

- `admin.html` and the encrypted vault are public, like every file on GitHub Pages. The password is the only thing standing between a visitor and edit access, so use a long passphrase.
- The token is scoped to this repository's contents only. If it leaks, revoke it in GitHub settings.
- Nothing runs server-side. Publishing is a commit made by your browser through the GitHub API, and uploaded photos and videos are commits too, so keep files reasonably small. The editor rejects anything over 40 MB.

## Domain

DNS for `mzkjack.com` at your registrar:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  minjoonjkim.github.io
```

Then in the repo: Settings → Pages → Custom domain `mzkjack.com` → wait for the DNS check → tick **Enforce HTTPS**.
