# Social Auth Provider Configuration

This guide explains how to configure social login providers for this SaaS kit (currently Google and GitHub), and how to add more providers later.

## How it works

- Provider credentials live in `.env` and are read via `config/services.php`.
- Available providers are defined in `config/social-auth.php`.
- Admin can enable/disable social auth at:
  - `Admin -> Settings -> Social Auth`
- A provider cannot be enabled unless required config values are present.

## Environment variables used

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI="${APP_URL}/auth/github/callback"
```

## Google setup (Google Cloud Console)

1. Open Google Cloud Console and create/select a project.
2. Go to `APIs & Services -> OAuth consent screen`.
3. Configure the consent screen (app name, support email, scopes).
4. Go to `APIs & Services -> Credentials -> Create Credentials -> OAuth client ID`.
5. Choose application type:
   - Usually `Web application`.
6. Add Authorized redirect URI:
   - `https://your-share-domain/auth/google/callback` (or production domain)
7. Copy Client ID and Client Secret to `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
8. Set `GOOGLE_REDIRECT_URI` to the same redirect URI you configured in Google.

## GitHub setup (GitHub Developer Settings)

1. Go to GitHub `Settings -> Developer settings -> OAuth Apps`.
2. Click `New OAuth App`.
3. Set:
   - Application name
   - Homepage URL (your app URL)
   - Authorization callback URL:
     - `https://your-share-domain/auth/github/callback`
4. Create app and generate client secret.
5. Copy values into `.env`:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
6. Set `GITHUB_REDIRECT_URI` to the same callback URL.

## Local testing with Herd Share (recommended)

Google does not reliably allow `.test` domains for OAuth callbacks, so use a public HTTPS share URL.

1. Start your app locally as usual with Herd.
2. Run Herd Share and get your public HTTPS URL.
3. Update `.env`:

```env
APP_URL="https://your-share-domain"
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
GITHUB_REDIRECT_URI="${APP_URL}/auth/github/callback"
```

4. In Google/GitHub developer consoles, set callback URLs to the exact same values.
5. Run:
   - `php artisan config:clear`
6. In admin settings, enable Social Auth and the configured providers.

Important:
- Callback URL matching is strict (scheme, host, path, and port must match exactly).
- If your Herd Share URL changes, update both provider dashboards and `.env` again.

## Enable providers in admin

After `.env` is configured:

1. Login as admin.
2. Open `Admin -> Settings -> Social Auth`.
3. Enable:
   - Global social auth toggle
   - One or more configured providers
4. Save.

If a provider is missing credentials, it is shown as not configured and cannot be enabled.

## Add a new provider

To add a new provider like LinkedIn, Microsoft, etc.:

1. Add credentials mapping in `config/services.php`:
   - `services.<provider>.client_id`
   - `services.<provider>.client_secret`
   - `services.<provider>.redirect`
2. Add env keys to `.env.example`.
3. Register provider in `config/social-auth.php`:
   - key (e.g. `linkedin`)
   - label
   - Socialite driver
   - `required_config` array
4. Configure real values in `.env`.
5. Enable from admin social auth settings.

No controller/UI hardcoding is required if the provider uses the standard Socialite flow.

## Troubleshooting

- Provider toggle disabled in admin:
  - Check `.env` keys and `required_config` entries.
- Redirect mismatch error from provider:
  - Ensure provider dashboard callback URL exactly matches `*_REDIRECT_URI`.
- Changes not reflected:
  - Run `php artisan config:clear`.
- Never commit real secrets to git.
