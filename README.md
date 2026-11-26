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

## Song search (adds straight to the Spotify playlist)

`src/worker.js` serves the site and a small `/api/songs/*` API. The search box on the Music pane stays hidden until it's set up. One-time setup, done by the **playlist owner**:

1. Go to developer.spotify.com → Dashboard → **Create app**. Add the redirect URI
   `https://<your-site>/api/spotify/callback` (your workers.dev URL) and tick **Web API**.
2. In Cloudflare → Workers → this worker → **Settings → Variables and Secrets**, add two **secrets**:
   `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (from the Spotify app's settings).
3. Open `https://<your-site>/api/spotify/login`, log in with the Spotify account that owns the playlist,
   and copy the refresh token it shows.
4. Add it as a third secret: `SPOTIFY_REFRESH_TOKEN`. The search box now appears on the Music pane.

The playlist ID lives in `wrangler.jsonc` (`SPOTIFY_PLAYLIST_ID`). Anyone with the site link can add songs.

## Deploy

Cloudflare Workers Builds deploys this repo. No API token is stored in the repo or on GitHub.

- Worker: `herman30y-butstillknowswhat-rizz-means`, connected to this repo in the Cloudflare dashboard.
- On every push to `main`, Cloudflare runs `npm run build` and then `npx wrangler deploy`.
- `wrangler.jsonc` serves `./dist` as static assets, with `workers_dev: true` and `preview_urls: false`.
- `public/_headers` sets noindex and caching headers.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, `npm run build` and `npx wrangler deploy --dry-run`, which needs no token.
