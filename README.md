# Herman30y_Butstillknowswhat_RIZZ_means

A single, maximally tacky page: **Hard Rizz coming up...** with explosions, cars, nunchucks and flames.

## Develop

```sh
npm ci
npm test
npm run build              # copies public/ -> dist/
npx wrangler dev           # local preview
```

## Deploy

Cloudflare Workers Builds deploys this repo. No API token is stored in the repo or on GitHub.

- Worker: `herman30y-butstillknowswhat-rizz-means`, connected to this repo in the Cloudflare dashboard.
- On every push to `main`, Cloudflare runs `npm run build` and then `npx wrangler deploy`.
- `wrangler.jsonc` serves `./dist` as static assets, with `workers_dev: true` and `preview_urls: false`.
- `public/_headers` sets noindex and caching headers.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, `npm run build` and `npx wrangler deploy --dry-run`, which needs no token.
