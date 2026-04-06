# Cosmic Canvas — Zooniverse Brush Tool Classifier

An interactive drawing classifier based on the [Zooniverse IFE Classifier Template](https://github.com/kieftrav/Zooniverse-IFE-April-2026-Workshop). This specialized version includes a brush tool for annotation tasks requiring freehand drawing.

## Attribution

This project is forked from the excellent Zooniverse IFE Classifier Template by [@kieftrav](https://github.com/kieftrav). Original repository: https://github.com/kieftrav/Zooniverse-IFE-April-2026-Workshop

## Quick Start

```bash
git clone https://github.com/astrohayley/cosmic-canvas.git
cd cosmic-canvas
npm install
```

### Configure your project

Copy the example config to a new file:

```bash
cp src/config.example.js src/config.js
```

Edit `src/config.js` — set your Zooniverse project ID and (optionally) workflow ID:

```js
const config = {
  projectId: '31425',
  workflowId: null,       // null = use project's default active workflow
  environment: 'production',
};
```

### Authentication (optional)

Copy `.env.example` to `.env` and add your Zooniverse credentials:

```bash
cp .env.example .env
```

```
VITE_PANOPTES_USERNAME=your_username
VITE_PANOPTES_PASSWORD=your_password
```

The app will sign in automatically on startup. Without a `.env`, it runs in anonymous mode. The header shows your auth status.

### OAuth Login (optional)

OAuth lets users log in via Zooniverse's own login page instead of storing credentials locally. When configured, a **"Log in with Zooniverse"** button appears in the header.

#### 1. Register an OAuth application

Go to https://panoptes.zooniverse.org/oauth/applications and create a new application:

- **Name:** whatever you like (e.g. "My Classifier")
- **Redirect URI:** `https://zooniverse.local.test/oauth/callback`
  - Add `urn:ietf:wg:oauth:2.0:oob` on a second line (the UI suggests this for local testing)
- **Scopes:** check all that apply to your use case

After submitting, you'll receive an **Application ID** and a **Secret**.

#### 2. Set up local HTTPS

OAuth requires HTTPS. The dev server uses mkcert certificates for `*.local.test`:

```bash
# Install mkcert (one-time)
brew install mkcert
mkcert -install

# Generate certs
mkdir -p .ssl
cd .ssl
mkcert "*.local.test" "local.test"
cd ..
```

This creates `.ssl/_wildcard.local.test+1.pem` and `.ssl/_wildcard.local.test+1-key.pem`. The `.ssl/` directory is gitignored.

> **Cert expiry:** mkcert certs are valid for ~2 years. Check with:
> `openssl x509 -enddate -noout -in .ssl/_wildcard.local.test+1.pem`

Add `zooniverse.local.test` to your hosts file if not already present:

```bash
echo "127.0.0.1 zooniverse.local.test" | sudo tee -a /etc/hosts
```

#### 3. Configure OAuth in `src/config.js`

```js
oauthClientId: 'YOUR_APPLICATION_ID',
oauthClientSecret: 'YOUR_SECRET',
oauthRedirectUri: 'https://zooniverse.local.test/oauth/callback',
```

#### 4. Start the dev server

```bash
npx vite --host
```

The server runs on **https://zooniverse.local.test** (port 443). Open that URL in your browser and click "Log in with Zooniverse".

The OAuth flow:
1. User clicks "Log in with Zooniverse"
2. Browser redirects to `www.zooniverse.org/oauth/authorize`
3. User signs in and authorizes the app
4. Zooniverse redirects back with an authorization code
5. The app exchanges the code for an access token (via the Vite proxy)
6. The token is stored in localStorage and persists across page reloads

#### How it works

| File | Role |
|------|------|
| `src/config.js` | OAuth client ID, secret, and redirect URI |
| `src/services/panoptesService.js` | `getOAuthLoginUrl()`, `exchangeCodeForToken()`, token storage |
| `src/App.jsx` | Detects `?code=` callback, manages auth state, renders login/sign-out button |
| `vite.config.js` | HTTPS config, `/zooniverse` proxy to `www.zooniverse.org` |

> **Note:** The token exchange uses a Vite proxy (`/zooniverse` → `www.zooniverse.org`) because the Zooniverse `/oauth/token` endpoint does not support CORS. The Panoptes API endpoints (`/api/*`) support CORS and are called directly.

### Run

```bash
npx vite --host
```

Open https://zooniverse.local.test.

For HTTP-only (no OAuth), you can still run on any port:

```bash
VITE_PORT=3002 npx vite
```

You can override config via URL params:

```
https://zooniverse.local.test/?project=31425
https://zooniverse.local.test/?project=31425&workflow=30447&env=staging
```

## Classifying

Load the app, view the subject, and click **Done** to submit a classification to the Panoptes API. Click **Skip** to move to the next subject without submitting.

## Exporting Data

The export bar at the bottom of the page has buttons for **project**, **workflow**, **subject-sets**, and **subjects**. Click any of them to download the JSON from the Panoptes API into the `exports/` folder in this repo. Open that folder to inspect the raw data.

This only works during local development (the Vite dev server writes files to disk).


## Project Structure

```
src/
  config.js               # Project/workflow IDs, OAuth credentials, links
  App.jsx                 # The classify loop (load → annotate → submit → next)
  components/
    SubjectViewer.jsx     # Displays subject images
    TaskUI.jsx            # Renders workflow tasks as forms
  services/
    panoptesService.js    # Panoptes API client + OAuth + token management
  index.css               # Styles
.env.example              # Template for password-based auth credentials
.ssl/                     # mkcert certificates for local HTTPS (gitignored)
vite.config.js            # Dev server, HTTPS, auth proxy, export-to-disk middleware
exports/                  # Exported JSON (gitignored)
```

## Commands

| Command | Description |
|---|---|
| `npx vite --host` | HTTPS dev server on https://zooniverse.local.test (port 443) |
| `VITE_PORT=3002 npx vite` | HTTP dev server on http://localhost:3002 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code style |

## Links

- [Zooniverse](https://www.zooniverse.org/)
- [Panoptes API docs](https://zooniverse.github.io/panoptes-javascript-client/)
- [Data Exports](https://www.zooniverse.org/lab/31425/data-exports) — view and export classification data from the Zooniverse Lab
