// Build pipeline for the password-protected site.
//
// Steps:
//   1. Compress the portrait to WebP and inline it as a data URI in index.html
//      (so the portrait ships *inside* the encrypted HTML, never as a loose file).
//   2. Minify the resulting markup (also minifies the inline JS/CSS).
//   3. Encrypt the whole HTML with pagecrypt using PAGECRYPT_PASSWORD.
//   4. Copy the *unencrypted* assets (style.css, screenshots/) into dist/.
//
// The PII lives in the HTML, so only index.html is encrypted. The stylesheet and
// project screenshots are non-sensitive and stay as plain external files that the
// decrypted page references relatively (style.css, screenshots/...).

import { readFile, writeFile, rm, mkdir, cp } from 'node:fs/promises';
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

  // 2. Minify markup + inline JS/CSS.
  html = await minify.html(html);

  // 3. Encrypt.
  const encrypted = await encryptHTML(html, PASSWORD);
  await writeFile(path.join(distDir, 'index.html'), encrypted);
  console.log(`index.html → encrypted (${kb(Buffer.byteLength(encrypted))})`);

  // 4. Unencrypted assets.
  const css = await minify(path.join(srcDir, 'style.css'));
  await writeFile(path.join(distDir, 'style.css'), css);
  await cp(path.join(srcDir, 'screenshots'), path.join(distDir, 'screenshots'), {
    recursive: true,
  });
  console.log('style.css + screenshots/ → copied (unencrypted)');

  console.log('\n✓ build complete → dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
