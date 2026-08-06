# QUD Virtual Portfolio MVP — unified Worker

Use `site-edge-vp-mvp.js` as the complete code for the Cloudflare Worker route:

`fx-qud.com/portal/vp/*`

## Required Worker variables

- `QUD_VP_ACCESS_KEY` — existing access key.
- `QUD_VP_APPS_SCRIPT_URL` — deployed Apps Script API v2 `/exec` URL.
- `QUD_VP_PROXY_SECRET` — the same proxy secret stored in Apps Script properties.

## Optional Worker variables

- `QUD_VP_SESSION_SECRET` — dedicated cookie-signing secret. When absent, the Worker uses `QUD_VP_ACCESS_KEY` for the MVP session signature.
- `QUD_VP_SUBSCRIBER_ID` — defaults to `TEST-SUBSCRIBER-001`.
- `QUD_VP_PORTFOLIO_ID` — defaults to `QVP-20260728-00B2`.

## Safe deployment sequence

1. Open the existing Cloudflare Worker `site-edge`.
2. Copy the current Worker code into a local backup before replacing it.
3. Replace the Worker code with the full contents of `site-edge-vp-mvp.js`.
4. Confirm that all three required variables exist and remain secret.
5. Deploy.
6. Open `https://fx-qud.com/portal/portfolio/mvp/`, log out, then log in again.
7. Open the protected diagnostic endpoint in the same browser session:
   `https://fx-qud.com/portal/vp/diagnostics`

A correct diagnostic response has:

- `authenticated: true`
- `identity.subscriber_id: TEST-SUBSCRIBER-001`
- `identity.portfolio_id: QVP-20260728-00B2`
- all configuration fields set to `true`
- `upstream.reachable: true`
- `upstream.api_ok: true`
- `upstream.portfolios_count: 1`

The diagnostic response never exposes the access key, proxy secret, session token, or Apps Script URL.
