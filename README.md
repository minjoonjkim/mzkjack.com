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
| `CNAME` | Custom domain for GitHub Pages. |

## Editing content

**Option A: the editor.** Open `https://mzkjack.com/admin.html`, enter your password, edit in the form on the left, watch the preview on the right, click **Publish**. The site updates within about a minute.

**Option B: by hand.** Edit `content.js` in any text editor and push. Text fields accept `**bold**` and line breaks.

Section types available in `content.js` (and in the editor's "Add section" menu):

- `text` — a title and paragraphs
- `entries` — jobs, degrees, activities (heading, org, location, dates, bullets)
- `table` — name / description / small tag rows (projects, certifications)
- `skills` — label / chips rows
- `stats` — three big numbers with labels
- `cards` — a two-column grid of small cards with facts

## First-time editor setup

1. Create a GitHub fine-grained token at https://github.com/settings/personal-access-tokens/new
   - Repository access: **Only select repositories** → this repo
   - Permissions → Repository → **Contents: Read and write**
2. Open `admin.html` on the live site (or on `localhost`, see below). It shows **First-time setup**.
3. Paste the token, choose a password of 12+ characters, submit.

The editor encrypts the token with your password (PBKDF2, 600k iterations, AES-256-GCM) and commits the encrypted blob to `admin-config.js`. The password is never stored. To rotate the token or reset the password, click **Reset access…** on the lock screen and repeat setup with a new token.

The editor needs `https://` or `localhost` for the browser's crypto API. Locally, run:

```
python3 -m http.server 8000
```

and open http://localhost:8000/admin.html.

## Security notes

- `admin.html` and the encrypted vault are public, like every file on GitHub Pages. The password is the only thing standing between a visitor and edit access, so use a long passphrase.
- The token is scoped to this repository's contents only. If it leaks, revoke it in GitHub settings.
- Nothing runs server-side. Publishing is a commit made by your browser through the GitHub API.

## Domain

DNS for `mzkjack.com` at your registrar:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  minjoonkimzk.github.io
```

Then in the repo: Settings → Pages → Custom domain `mzkjack.com` → wait for the DNS check → tick **Enforce HTTPS**.
