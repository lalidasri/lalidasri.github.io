# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for a UX researcher, deployed as a static site to GitHub Pages at lalida.me using the gh-pages package. The site is built with vanilla HTML/CSS (no build process or framework) and features a neon-styled, cyberpunk-themed design.

## Development Commands

```bash
# Start local development server (serves src/ folder at http://localhost:3000)
npm run dev

# Format code (HTML and CSS)
npm run format

# Build minified files to dist/ directory
npm run build

# Deploy to GitHub Pages (automatically builds first via predeploy hook)
npm run deploy

# Clean build artifacts
npm run clean
```

The development server uses `serve` to serve the `src/` directory. The build process minifies HTML and CSS using the `minify` package.

## Architecture

### Deployment Structure

- **Source files**: All website files live in `src/` directory
  - `src/index.html` - Main portfolio page
  - `src/style.css` - All styling (uses CSS custom properties for theming)
  - `src/portrait.jpeg` - Profile image
  - `src/screenshots/` - Project screenshots referenced in carousels

- **Build process**: The `npm run build` command:
  - Cleans and creates `dist/` directory
  - Minifies HTML and CSS using the `minify` package
  - Copies image assets (portrait.jpeg and screenshots/)
  - Output goes to `dist/` (git-ignored)

- **Deployment**: The `npm run deploy` command automatically runs the build, then uses gh-pages to publish the `dist/` directory to the `gh-pages` branch with a CNAME file for the custom domain `lalida.me`

- **CI/CD**: GitHub Actions workflow at `.github/workflows/deploy.yml` automatically builds and deploys to GitHub Pages on push to `main` branch

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
