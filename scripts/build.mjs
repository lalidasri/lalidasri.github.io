// Build pipeline for the password-protected site.
//
// Steps:
//   1. Compress the portrait to WebP and inline it as a data URI in index.html
//      (so the portrait ships *inside* the encrypted HTML, never as a loose file).
//   2. Minify the resulting markup (also minifies the inline JS/CSS).
//   3. Encrypt the whole HTML with pagecrypt using PAGECRYPT_PASSWORD.
//   4. Write the *unencrypted* assets into dist/: style.css (minified), fonts/
//      (copied), and screenshots/ (compressed to WebP).
//
// The PII lives in the HTML, so only index.html is encrypted. The stylesheet and
// project screenshots are non-sensitive and stay as plain external files that the
// decrypted page references relatively (style.css, screenshots/...).

import { readFile, writeFile, rm, mkdir, cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { minify } from 'minify';
import { encryptHTML } from 'pagecrypt';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

const PASSWORD = process.env.PAGECRYPT_PASSWORD;
if (!PASSWORD) {
  console.error(
    'ERROR: PAGECRYPT_PASSWORD is not set.\n' +
      '  - Local preview:  npm run preview   (uses a throwaway test password)\n' +
      '  - Real build:     PAGECRYPT_PASSWORD="…" npm run build\n' +
      '  - CI:             set the SITE_PASSWORD repository secret.'
  );
  process.exit(1);
}

// Portrait is displayed at ~440px CSS width; 900px source keeps it crisp on
// retina while compressing ~165KB JPEG down to ~40KB WebP.
const PORTRAIT_WIDTH = 900;
const PORTRAIT_QUALITY = 82;

// Work screenshots render in a ~300px CSS-wide grid; 900px keeps them crisp at
// 2x/3x while WebP + resize takes the set from ~1.8MB down to a few hundred KB.
const SHOT_WIDTH = 900;
const SHOT_QUALITY = 80;

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

// ---------------------------------------------------------------------------
// Themed unlock page
//
// pagecrypt ships a generic dark "Protected Page" prompt. We re-skin it to
// match the site's warm-editorial look (terracotta on paper, Fraunces + Inter)
// and add a header explaining what's behind the gate — without touching
// pagecrypt's inline decryption <script> or the <pre data-i> payload it injects.
// The self-hosted fonts ship unencrypted to dist/fonts/, so the relative
// url()s below resolve against the site origin just like the main page's do.
// ---------------------------------------------------------------------------

// Reused verbatim from src/index.html so the tab icon matches the real page.
const FAVICON =
  "<link rel=icon href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23bc5c35'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='21' font-weight='600' text-anchor='middle' fill='%23faf6f2'%3EL%3C/text%3E%3C/svg%3E\">";

const UNLOCK_STYLE = `
@font-face{font-family:'Fraunces';font-style:normal;font-weight:400 600;font-display:swap;src:url('fonts/fraunces-normal.woff2') format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-weight:400 600;font-display:swap;src:url('fonts/inter.woff2') format('woff2')}
:root{
  --paper:oklch(0.976 0.007 75);--surface:oklch(0.955 0.011 70);
  --ink:oklch(0.27 0.018 55);--ink-soft:oklch(0.44 0.017 55);--ink-faint:oklch(0.515 0.015 55);
  --terracotta:oklch(0.585 0.135 42);--terracotta-deep:oklch(0.485 0.13 40);--terracotta-btn:oklch(0.55 0.14 42);
  --terracotta-wash:oklch(0.945 0.028 48);--sage-wash:oklch(0.952 0.02 152);--line:oklch(0.885 0.012 65);
  --error:oklch(0.53 0.2 28);
  --font-display:'Fraunces',Georgia,'Times New Roman',serif;
  --font-body:'Inter',system-ui,-apple-system,sans-serif;
  --ease-out:cubic-bezier(0.22,1,0.36,1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;border:0}
html{-webkit-text-size-adjust:100%}
body{min-height:100vh;color:var(--ink);font-family:var(--font-body);font-weight:400;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  background:
    radial-gradient(62% 52% at 88% -6%,var(--terracotta-wash),transparent 68%),
    radial-gradient(52% 44% at -6% 106%,var(--sage-wash),transparent 70%),
    var(--paper);
}
svg{display:block}
main{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1.25rem}
.box{width:100%;max-width:27rem;display:flex;flex-direction:column;align-items:center;text-align:center;
  background:color-mix(in oklch,var(--surface) 82%,var(--paper));
  border:1px solid var(--line);border-radius:20px;padding:2.75rem 2.25rem 2.5rem;
  box-shadow:0 32px 64px -44px oklch(0.3 0.05 45 / 0.55);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
}
.badge{width:3.25rem;height:3.25rem;border-radius:999px;display:flex;align-items:center;justify-content:center;
  color:var(--terracotta-deep);background:var(--terracotta-wash);
  border:1px solid color-mix(in oklch,var(--terracotta) 28%,transparent);margin-bottom:1.6rem}
.badge svg{width:1.5rem;height:1.5rem}
.kicker{font-size:0.72rem;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:var(--terracotta-deep);margin-bottom:0.85rem}
h1{font-family:var(--font-display);font-weight:500;font-size:clamp(1.65rem,1.3rem+1.6vw,2.1rem);
  line-height:1.1;letter-spacing:-0.015em;text-wrap:balance;margin-bottom:0.9rem}
.lede{color:var(--ink-soft);font-size:1rem;line-height:1.6;max-width:23rem;text-wrap:pretty;margin-bottom:1.9rem}
#load{display:flex;align-items:center;justify-content:center;gap:0.6rem;min-height:3.25rem;color:var(--ink-soft);font-size:0.95rem}
.spinner{width:1.2rem;height:1.2rem;border:2.5px solid color-mix(in oklch,var(--terracotta) 28%,transparent);
  border-top-color:var(--terracotta-btn);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
header{width:100%;flex-direction:column;margin-bottom:0.7rem}
#msg{font-size:0.85rem;letter-spacing:0.01em;color:var(--ink-faint)}
header.red #msg{color:var(--error)}
form{width:100%;display:flex;flex-direction:column;gap:0.7rem}
#pwd{width:100%;font-family:var(--font-body);font-size:1rem;color:var(--ink);background:var(--paper);
  border:1px solid var(--line);border-radius:999px;padding:0.85rem 1.3rem;
  transition:border-color .2s var(--ease-out),box-shadow .2s var(--ease-out)}
#pwd::placeholder{color:var(--ink-faint)}
#pwd:focus{outline:none;border-color:var(--terracotta-btn);
  box-shadow:0 0 0 3px color-mix(in oklch,var(--terracotta-btn) 22%,transparent)}
#pwd:disabled{opacity:.6;cursor:not-allowed}
button[type=submit]{cursor:pointer;font-family:var(--font-body);font-weight:600;font-size:0.98rem;
  color:var(--paper);background:var(--terracotta-btn);border-radius:999px;padding:0.85rem 1.5rem;
  transition:transform .25s var(--ease-out),background-color .25s var(--ease-out)}
button[type=submit]:hover{background:var(--terracotta-deep);transform:translateY(-1px)}
button[type=submit]:focus-visible{outline:2px solid var(--terracotta-deep);outline-offset:2px}
.hidden{display:none!important}
.flex{display:flex}
`;

// The <main> markup. Keeps every hook pagecrypt's script relies on:
//   • first <input> = the password field   • <header> holding #msg (the status line)
//   • <form>   • #load whose last child is the "Loading…"/"Decrypting…" text
// The branding (badge, kicker, h1, lede) sits outside those toggled nodes so it
// stays visible through the loading / decrypting states.
const UNLOCK_BODY = `<main><div class=box>\
<div class=badge aria-hidden=true><svg viewBox="0 0 20 20" fill=currentColor><path fill-rule=evenodd d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule=evenodd></path></svg></div>\
<p class=kicker>Private Portfolio</p>\
<h1>Lalida Sritanyaratana</h1>\
<p class=lede>This portfolio is private. Enter the password to view Lalida's UX research work, experience, and selected projects.</p>\
<div id=load><span class=spinner></span><p>Loading&hellip;</p></div>\
<header class=hidden><p id=msg>Enter the password to continue.</p></header>\
<form class=hidden><input type=password id=pwd name=pwd placeholder=Password aria-label=Password autofocus><button type=submit>Unlock portfolio</button></form>\
</div></main>`;

/**
 * Re-skin pagecrypt's generic prompt to match the site, leaving its inline
 * decryption <script> and the injected <pre data-i> payload untouched.
 * Throws if pagecrypt's template no longer contains an expected anchor, so a
 * dependency bump can't silently ship the un-themed default page.
 */
function themeUnlockPage(page) {
  const swaps = [
    [
      '<title>Protected Page</title>',
      `<title>Lalida Sritanyaratana · Private Portfolio</title>${FAVICON}`,
    ],
    [/<style>.*?<\/style>/s, `<style>${UNLOCK_STYLE}</style>`],
    [/<main>.*?<\/main>/s, UNLOCK_BODY],
  ];
  for (const [find, replace] of swaps) {
    const next = page.replace(find, replace);
    if (next === page) {
      throw new Error(
        `Unlock theme: anchor ${find} not found in pagecrypt output — ` +
          'the pagecrypt template likely changed; update scripts/build.mjs.'
      );
    }
    page = next;
  }

  // Persist the unlock across visits. pagecrypt caches the derived AES key (not
  // the password) in sessionStorage, which is wiped when the tab closes — so a
  // returning visitor is re-prompted. Promote that cache to localStorage so the
  // gate stays unlocked across tab-closes and future visits. A stale key (e.g.
  // after the password is rotated) simply fails to decrypt and is auto-cleared
  // by pagecrypt's own catch handler, so the prompt self-heals.
  if (!page.includes('sessionStorage')) {
    throw new Error(
      'Unlock persistence: expected sessionStorage in pagecrypt script — ' +
        'the pagecrypt template likely changed; update scripts/build.mjs.'
    );
  }
  page = page.replaceAll('sessionStorage', 'localStorage');

  return page;
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // 1. Compress + inline the portrait.
  const webp = await sharp(path.join(srcDir, 'portrait.jpg'))
    .resize({ width: PORTRAIT_WIDTH, withoutEnlargement: true })
    .webp({ quality: PORTRAIT_QUALITY })
    .toBuffer();
  const dataUri = `data:image/webp;base64,${webp.toString('base64')}`;
  console.log(`portrait.jpg → inline WebP (${kb(webp.length)})`);

  let html = await readFile(path.join(srcDir, 'index.html'), 'utf8');
  if (!html.includes('src="portrait.jpg"')) {
    throw new Error('Could not find src="portrait.jpg" in index.html to inline.');
  }
  // Inline the (quoted) data URI before minifying so the minifier keeps it quoted.
  html = html.replace('src="portrait.jpg"', `src="${dataUri}"`);

  // Point screenshot references at their built WebP variants (files written in step 4).
  html = html.replace(
    /src="screenshots\/([^"]+)\.(?:png|jpe?g)"/g,
    'src="screenshots/$1.webp"'
  );

  // 2. Minify markup + inline JS/CSS.
  html = await minify.html(html);

  // 3. Encrypt, then re-skin the unlock prompt to match the site.
  const encrypted = themeUnlockPage(await encryptHTML(html, PASSWORD));
  await writeFile(path.join(distDir, 'index.html'), encrypted);
  console.log(`index.html → encrypted (${kb(Buffer.byteLength(encrypted))})`);

  // 4. Unencrypted assets.
  const css = await minify(path.join(srcDir, 'style.css'));
  await writeFile(path.join(distDir, 'style.css'), css);

  // Compress work screenshots to WebP (referenced as .webp in the HTML above).
  const shotsSrc = path.join(srcDir, 'screenshots');
  const shotsDist = path.join(distDir, 'screenshots');
  await mkdir(shotsDist, { recursive: true });
  let shotsBefore = 0;
  let shotsAfter = 0;
  for (const file of await readdir(shotsSrc)) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const input = await readFile(path.join(shotsSrc, file));
    const out = await sharp(input)
      .resize({ width: SHOT_WIDTH, withoutEnlargement: true })
      .webp({ quality: SHOT_QUALITY })
      .toBuffer();
    await writeFile(
      path.join(shotsDist, file.replace(/\.(png|jpe?g)$/i, '.webp')),
      out
    );
    shotsBefore += input.length;
    shotsAfter += out.length;
  }
  console.log(
    `screenshots/ → WebP (${kb(shotsBefore)} → ${kb(shotsAfter)})`
  );

  await cp(path.join(srcDir, 'fonts'), path.join(distDir, 'fonts'), {
    recursive: true,
  });
  console.log('style.css + fonts/ → copied (unencrypted)');

  console.log('\n✓ build complete → dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
