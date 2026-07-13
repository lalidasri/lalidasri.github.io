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

  // 3. Encrypt.
  const encrypted = await encryptHTML(html, PASSWORD);
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
