# StowPlan — hosting on GitHub Pages

1. In your `audiorazor.github.io` repo, create a folder `stowplan/`.
2. Copy everything in this zip into it: index.html, manifest.json, sw.js, icon-192.png, icon-512.png.
3. Commit and push. The app is live at https://audiorazor.github.io/stowplan/

Updating: replace index.html and bump `CACHE` in sw.js (v1 → v2) so phones pick up the new version.

On your phone: open the URL in Safari → Share → Add to Home Screen. Installed apps are exempt from
Safari's 7-day storage eviction; a tab that's just bookmarked is not.

Data lives in that browser's storage. Use Data… → Export JSON for backups and Data… → Bake to
write your library into index.html itself — then commit the baked index.html and the library can't be lost.
