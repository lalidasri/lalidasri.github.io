# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for a UX researcher, deployed as a static site to GitHub Pages at lalida.me using the gh-pages package. The site is built with vanilla HTML/CSS (no framework). The published `index.html` is **password-protected** with [pagecrypt](https://github.com/Greenheart/pagecrypt): all of the PII lives in the HTML, so the HTML (with the portrait inlined) is client-side encrypted, while the non-sensitive `style.css` and project `screenshots/` ship as plain external files.

## Development Commands

```bash
# Edit content: serve the raw, unencrypted src/ folder at http://localhost:3000
npm run dev

# Preview the REAL encrypted output locally (builds with a throwaway test
# password, then serves dist/ at http://localhost:7086). Unlock with:
#   test-password-123
npm run preview

# Format code (HTML and CSS)
npm run format

# Build the encrypted dist/ (requires PAGECRYPT_PASSWORD to be set)
PAGECRYPT_PASSWORD="…" npm run build

# Deploy to GitHub Pages (builds first via predeploy hook; needs PAGECRYPT_PASSWORD)
PAGECRYPT_PASSWORD="…" npm run deploy

# Clean build artifacts
npm run clean
```

`npm run dev` serves `src/` directly so you can iterate on content/styling without
the password gate. `npm run preview` exercises the full production pipeline
(compress → inline → minify → encrypt) so you can confirm the gate and the
decrypted page before deploying.

### Password handling

- The build script (`scripts/build.mjs`) reads the password from the
  `PAGECRYPT_PASSWORD` environment variable and **refuses to build without it** —
  this prevents accidentally shipping a default/weak password.
- Locally, `npm run preview` / `build:preview` inject the test password
  `test-password-123`. This is intentionally throwaway; never use it for a real deploy.
- In CI, the password comes from the `SITE_PASSWORD` GitHub Actions secret
  (Settings → Secrets and variables → Actions). The deploy job fails loudly if it
  is unset. **To change the real password, just update that secret and re-run the
  workflow** — no code change needed.

## Architecture

### Deployment Structure

- **Source files**: All website files live in `src/` directory
  - `src/index.html` - Main portfolio page (contains the PII; gets encrypted)
  - `src/style.css` - All styling (ships unencrypted)
  - `src/portrait.jpg` - Profile image (compressed to WebP + inlined into the encrypted HTML at build time)
  - `src/screenshots/` - Project screenshots referenced in the work section (ship unencrypted)

- **Build process** (`scripts/build.mjs`, run via `npm run build`):
  1. Cleans and recreates `dist/`
  2. Compresses `src/portrait.jpg` to WebP (`sharp`, 900px / q82) and inlines it as a `data:` URI in the HTML
  3. Minifies the HTML markup + inline JS/CSS (`minify` package)
  4. Encrypts the HTML with `pagecrypt` using `PAGECRYPT_PASSWORD` → `dist/index.html`
  5. Copies `style.css` (minified) and `screenshots/` to `dist/` **unencrypted**
  - Output goes to `dist/` (git-ignored)

- **How the encryption works at runtime**: `pagecrypt` emits a self-contained page with a password prompt. On the correct password it decrypts the original HTML client-side and `document.write`s it, so the relative `style.css` / `screenshots/…` references resolve normally against the site origin. Only `index.html` (text + portrait) is protected; the stylesheet and screenshots are intentionally public.

- **Deployment**: `npm run deploy` builds then uses gh-pages to publish `dist/` to the `gh-pages` branch with a CNAME for `lalida.me`. Requires `PAGECRYPT_PASSWORD`.

- **CI/CD**: GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys on push to `main`, reading the password from the `SITE_PASSWORD` secret (see Password handling above).

### Design System

The site uses a cohesive neon/cyberpunk aesthetic implemented through CSS custom properties in `src/style.css`:

- Color palette: `--bg-dark`, `--neon-magenta`, `--neon-cyan`, `--neon-orange`, `--text-light`
- Typography: `--font-script` (Mr Dafoe for headlines), `--font-tech` (Orbitron for titles), `--font-body` (Inter for text)
- Visual effects: Ambient glows via fixed-position blurred elements, neon text-shadows, animated portrait glow with blob morphing animation

### HTML Structure

Single-page application with sections:
- Header with logo and navigation
- Hero section with neon script headline, bio, and portrait
- Experience section with timeline entries
- About section
- Selected Work section with project carousels showing screenshots and external press links
- Contact section with social links

## Code Style

- Prettier is configured for formatting: semicolons enabled, single quotes, 2-space tabs, ES5 trailing commas
- All content is in a single HTML file (no templating or components)
- CSS uses semantic class names organized by section with responsive breakpoints at 900px
