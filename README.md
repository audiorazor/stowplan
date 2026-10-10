# StowPlan

Truck and sea-container load planner for touring production crews. One HTML file (`app/stowplan.html`) wrapped in Electron for the Mac desktop app; the same file is published as a PWA from `site/`.

## Layout

- `app/stowplan.html` — the whole application (UI, packer, weight & balance, storage layer)
- `main.js`, `preload.js` — Electron shell; data lives in `~/Documents/StowPlan/stowplan-data.json`
- `site/` — GitHub Pages bundle (`index.html` is a copy of `app/stowplan.html`, plus service worker + icons)
- `build/icon.png` — app icon source; `build/logo-options.html` — logo explorations

## Build (Apple Silicon)

```bash
npm install
npx electron-builder --mac --arm64 --dir
tar -czf StowPlan-AppleSilicon-Mac.tar.gz -C dist/mac-arm64 StowPlan.app
```

Use `tar`, not electron-builder's zip target — macOS Archive Utility chokes on the builder's zip. Bump `APP_VERSION` in `app/stowplan.html` and `CACHE` in `site/sw.js` with each release.

## Install

Download the `.tar.gz` from the latest Release, then:

```bash
tar -xzf StowPlan-AppleSilicon-Mac.tar.gz
rm -rf /Applications/StowPlan.app && mv StowPlan.app /Applications/
xattr -cr /Applications/StowPlan.app && open /Applications/StowPlan.app
```

The app is unsigned, so the first launch may need right-click → Open.
