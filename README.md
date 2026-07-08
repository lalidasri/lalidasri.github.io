# lalidasri.github.io

Personal portfolio website for Lalida Sritanyaratana, a UX researcher. Built with
vanilla HTML/CSS and deployed to [lalida.me](https://lalida.me) via GitHub Pages.

## Password protection

The published `index.html` is **password-protected** with
[pagecrypt](https://github.com/Greenheart/pagecrypt). All of the personal
information lives in the HTML, so the HTML — with the portrait compressed to WebP
and inlined — is encrypted client-side at build time. Visitors get a password
prompt and the page is decrypted in the browser on the correct password.

`style.css` and the project `screenshots/` are non-sensitive and ship as plain,
unencrypted external files that the decrypted page references normally.

## Commands

```bash
npm run dev       # edit content: serves raw, unencrypted src/ at localhost:3000
npm run preview   # build the REAL encrypted output + serve dist/ at localhost:7086
                  #   (unlock with the throwaway test password: test-password-123)
npm run build     # build encrypted dist/ (requires PAGECRYPT_PASSWORD)
npm run deploy    # build + publish to GitHub Pages (requires PAGECRYPT_PASSWORD)
npm run format    # prettier
```

The build pipeline lives in `scripts/build.mjs`: compress + inline the portrait →
minify → encrypt with pagecrypt → copy `style.css` and `screenshots/` unencrypted.

## Password handling

- The build **refuses to run without `PAGECRYPT_PASSWORD`**, so a weak/default
  password can never ship by accident.
- `npm run preview` / `npm run build:preview` inject the throwaway test password
  `test-password-123` — for local testing only.
- CI reads the password from the **`SITE_PASSWORD`** GitHub Actions secret
  (Settings → Secrets and variables → Actions). To change the real password,
  update that secret and re-run the deploy workflow — no code change needed.

See [CLAUDE.md](CLAUDE.md) for the full build/deploy architecture.
