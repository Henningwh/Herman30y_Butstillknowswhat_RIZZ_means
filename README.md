# Herman30y_Butstillknowswhat_RIZZ_means

Info site for Herman's 30th cabin trip to Studenterhytta: agenda, music, committees, practical info and luggage transport (`public/index.html`).

Easter egg: tap the "30" in the header five times to open the old **Hard Rizz** page (`public/rizz.html`).

## Develop

```sh
npm ci
npm test
npm run build              # copies public/ -> dist/
npx wrangler dev           # local preview
```

## Playlist tracklist

`src/worker.js` serves the site plus `/api/songs/list`, which reads the songs on the playlist from Spotify's public
embed page – no Spotify login or API keys. The playlist ID lives in `wrangler.jsonc` (`SPOTIFY_PLAYLIST_ID`).
People add songs with the "Open in Spotify & add songs" button (the playlist's collaborative invite link).

## Committee admin (PINs)

Each committee page has a **🔒 Admin** button. Entering that committee's PIN lets you change member photos,
names and fun facts, add/remove members, edit the committee description, and use a private activity planner.
PINs live in `src/pins.js` (they stay the same across deploys). Wrong PINs are rate-limited.

Everything admins change is stored in a Durable Object (`GroupStore`, SQLite) that Cloudflare creates on deploy –
no dashboard setup, and the data survives redeploys. `public/committee-data.json` is only the starting point:
each committee's members are copied from it the first time that committee is opened.

## Deploy

Cloudflare Workers Builds deploys this repo. No API token is stored in the repo or on GitHub.

- Worker: `herman30y-butstillknowswhat-rizz-means`, connected to this repo in the Cloudflare dashboard.
- On every push to `main`, Cloudflare runs `npm run build` and then `npx wrangler deploy`.
- `wrangler.jsonc` serves `./dist` as static assets, with `workers_dev: true` and `preview_urls: false`.
- `public/_headers` sets noindex and caching headers.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, `npm run build` and `npx wrangler deploy --dry-run`, which needs no token.
