# StowPlan

Truck and sea-container load planner for touring production crews. One HTML file (`app/stowplan.html`) wrapped in Electron for the Mac desktop app; the same file is published as a PWA from `site/`.

## How it's organised (v107+)

- **Inventory** (left): *Cases* — every case on the leg grouped by truck, Unassigned on top; *Catalog* — the sizes you can add.
- **Inspector** (left, below): every detail of whatever is selected, one case or many.
- **Workspace** (right): one canvas per leg. Every truck's floor plan sits in it, cases that don't fit line up beside their truck's doors, unassigned cases sit in a yard. Scroll to pan, ⌘/Ctrl+scroll to zoom, drag cases between trucks or out into the yard, drag a truck by its name to move it. *Tidy* lines everything back up.

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

## Pack JSON (import without the API)

The Import dialog also takes a `.json` describing a pack sheet — the same shape the photo reader returns — so a sheet read elsewhere (e.g. by Claude in chat) drops straight in:

```json
{"trucks":[{"name":"Lifts 1","total_weight_kg":14400,"boxes":[
  {"name":"DECK CART LIFTING RING","count":1,"dims_in":[45,102.5,76],"weight_kg":998,
   "x_start_ft":10.5,"x_end_ft":19,"lane":"top"},
  {"name":"FRAME 2","count":1,"shape":"trapezoid","dims_in":[64,120,24],"depth_b_in":28,
   "weight_kg":363,"x_start_ft":0,"x_end_ft":10,"lane":"bottom","flip":true}
]}]}
```

`dims_in` is `[width, length, height]` as printed on the sheet; `lane` is `top`, `bottom` or `full`; `rot: true` puts the short side along the truck; a trapezoid gives the depth at the straight end in `dims_in[0]` and the angled end in `depth_b_in`, with `flip` for the nested partner. Imported positions may slide forward a few cm to clear a neighbour (sheet scales are approximate).
