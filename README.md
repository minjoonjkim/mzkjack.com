# mzkjack.com

Personal website of Minjoon Jack Kim. Static HTML, no build step, hosted on GitHub Pages.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The site. Renders everything from `content.js`. |
| `content.js` | All English text on the site: profile, tabs, sections. Edit this to change content. |
| `content.ko.js` | The Korean site, same shape as `content.js`. Managed separately; the ENG / 한국어 switch in the header picks one. |
| `admin.html` | Password-protected editor with live preview. Publishes straight to GitHub. |
| `admin.js`, `admin-core.js` | Editor logic. |
| `admin-config.js` | Repo name plus your encrypted GitHub token (written by the editor on first setup). |
| `images/profile.jpg` | Your portrait. Add it; the site shows a placeholder until it exists. |
| `media/YYYY-MM/…` | Photos, videos and route maps attached to posts and races. Created by the editor when you post. |
| `CNAME` | Custom domain for GitHub Pages. |

## Languages

The site is available in English and Korean. Visitors switch with the **ENG / 한국어** control in the header; the choice is remembered in the browser, and a first visit from a Korean-language browser starts in Korean. `?lang=ko` or `?lang=en` in the URL forces one. Everything the page says on its own (dates, race tallies, empty states, buttons) follows the chosen language; everything else comes from the matching content file.

`content.js` is English and `content.ko.js` is Korean. The page itself (profile, experience, tables, skills, section titles) is written separately in each. The feeds are shared: updates, race results and blog posts are the same entries in both languages, paired by an `id`. Photos, videos, route maps, cover images, dates, distances and times are copied across on every publish, so a photo posted in English shows up in Korean. The words (titles, bodies, race names, notes, tags) stay per language: a new entry starts with the same text in both, and the other language keeps following your edits until you change its text yourself, after which it is left alone. Deleting or reordering an entry in Compose does the same in the other language.

In the editor, the **ENG / 한국어** switch in the top bar chooses which language's words you are editing; **Publish** writes that file and, when the shared feeds changed it, the other one too. Tab ids (`about`, `study`, …) should stay the same in both files so links and the feed pairing keep working.

## Page structure

The public page is a single scrolling portfolio built from `content.js` (and `content.ko.js` for Korean):

1. **Opening** — name, positioning statement, current role, one primary action (`portfolio.hero`)
2. **Selected work** — three or four editorial project entries with a Details disclosure (`portfolio.work`)
3. **Experience** — a timeline from the `about` tab's first `entries` block; each role can carry an `overview` and a `lead` count for how many bullets show before "All contributions"
4. **Background** — narrative paragraphs (`portfolio.background`)
5. **Outside work** — curated summary plus facts computed from the race data; the full race list sits behind a "Race archive" disclosure (`portfolio.outside` + the `races` block)
6. **Education & credentials** — compact rows from the Education entries and Certifications table
7. **Updates** / **Writing** — appear only once a post exists; hidden otherwise, including from navigation
8. **Contact** — email, and LinkedIn only when the href is a real `linkedin.com/in/...` profile URL

There is deliberately no public link to the editor. Open `/admin.html` directly.

**Known content TODOs:** the LinkedIn entry in `content.js` points at `https://www.linkedin.com/` (the homepage), so it is not rendered — set the real profile URL. No résumé PDF exists in the repository, so there is no Résumé link.

## Editing content

**Option A: the editor.** Click **Edit** in the site footer (or open `https://mzkjack.com/admin.html`) and enter your password. The editor has two modes:

- **Compose** — a social-post screen with two kinds of entry:
  - **Update** — pick which tab to post in, add a title and body, drag in (or paste, or browse for) as many photos and videos as you like, then hit **Post**.
  - **Blog post** — title, date, tags, cover image and a Markdown body, with a formatting toolbar and an **＋ Image** button that uploads and drops the Markdown tag at the cursor.
  - **Race result** — race name, date, location, distance, finish time, average pace, notes, a route map and photos. Pace fills itself in from the finish time and distance until you type your own, and picking a distance preset fills in the kilometres.

  Either way the files upload to the repo and the entry goes live in one step. Existing entries are listed underneath, with Edit and Delete.
- **Structure** — the full form for everything else on the page (profile, experience, tables, skills…), with a live preview on the right. Edit, then click **Publish**.

Either way the site updates within about a minute; freshly uploaded photos and videos appear once GitHub Pages finishes rebuilding.

**Option B: by hand.** Edit `content.js` (or `content.ko.js` for Korean) in any text editor and push. Text fields accept `**bold**` and line breaks.

Section types available in `content.js` (and in the editor's "Add section" menu):

- `text` — a title and paragraphs
- `entries` — jobs, degrees, activities (heading, org, location, dates, bullets)
- `table` — name / description / small tag rows (projects, certifications)
- `skills` — label / chips rows
- `stats` — three big numbers with labels
- `cards` — a two-column grid of small cards with facts
- `blog` — a writing tab: an index of posts, and a full-width reading view for each one. Post bodies are Markdown (headings, lists, quotes, code fences, images, links, bold/italic). The index shows date, reading time, tags and an auto-excerpt; each post lives at `#<tab>/<slug>`.
- `posts` — a feed of dated posts with a title, body and any number of photos or videos. Every tab starts with one; Compose → Update writes into it.
- `races` — a race log. Shows a tally across the top (**full marathons**, **half marathons**, **10 km races**, plus any other category you have raced) and the **next upcoming** race with a countdown, then one card per race with distance, finish time, average pace, notes, route map and photos. Compose → Race result writes into it; the Hobbies tab starts with one.

Dates are accepted as `2026-10-25`, `2026.10.25` or `2026/10/25` and normalised. A race with a finish time counts as run whatever its date says, so a typo in the year cannot push a finished race into the future. Average pace is derived from finish time and distance when you leave it blank.

Race counts come from the entries themselves — a race dated in the future is listed as *Upcoming* and left out of the tally until the day passes. Cards are ordered by date, newest first, so there is nothing to reorder by hand. Distances: `full`, `half`, `10k`, `5k`, `ultra`, `tri`, `hyrox`, `other`; set `km` for anything without a fixed distance.

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
