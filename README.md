# AI Companion

A modern, responsive AI Companion web app with a futuristic glassmorphism interface, account authentication, cloud conversation storage, and a Google Gemini-powered chat backend.

**Version:** 1.0.0  
**Copyright:** © 2026 TUBAL HUB

This repository is structured as a distributable/customizable software project. Buyers or developers can configure their own backend, database, AI provider credentials, authentication provider, branding, and hosting.

## Live Demo

[AI Companion on GitHub Pages](https://tubalrr.github.io/ai-companion/index.html)

> Deployment note: The GitHub Pages frontend is static. The Node.js backend, PostgreSQL database, Google Gemini API, and any paid subscription checkout must be deployed/configured separately for production use.

## Features

- Futuristic dark glassmorphism UI
- Responsive desktop and mobile design
- Desktop-style AI chat composer on mobile
- New Chat workflow
- Clickable AI suggestion cards
- Local recent conversation history
- Conversation actions: pin, rename, share, archive, delete
- Account registration and login
- HTTP-only JWT authentication
- Cloud conversations and messages with PostgreSQL
- Google Gemini-powered AI responses through the secure backend
- 7-day Premium trial flow
- Profile, Settings, Help, Library, Projects, Scheduled, Coding, and Upgrade pages
- Optional Firebase Authentication integration file
- GitHub Actions smoke testing with Playwright

## Commercial Documentation

- [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) — buyer usage license
- [INSTALLATION.md](INSTALLATION.md) — installation and deployment guide
- [CUSTOMIZATION.md](CUSTOMIZATION.md) — branding and configuration guide
- [SELLING.md](SELLING.md) — product listing and storefront preparation
- [RELEASE.md](RELEASE.md) — clean release package checklist
- [CHANGELOG.md](CHANGELOG.md) — release history

## Project Structure

```text
ai-companion/
├── index.html
├── style.css
├── script.js
├── assets/
│   ├── css/
│   └── js/
├── pages/
├── server/
├── tests/
├── package.json
├── playwright.config.js
├── LICENSE
├── COMMERCIAL-LICENSE.md
├── INSTALLATION.md
├── CUSTOMIZATION.md
├── SELLING.md
├── RELEASE.md
├── CHANGELOG.md
└── VERSION
```

## Authentication

The default authentication system uses Express/JWT with HTTP-only cookies and PostgreSQL.

An optional `assets/js/firebase-auth.js` file is included for buyers who want to use Firebase Authentication. It is a template/integration layer and is not connected to a TUBAL HUB Firebase project.

Buyers must use their own Firebase project and configuration. Never place Firebase Admin credentials or other server secrets in frontend files.

## Backend

The backend is located in `server/` and uses Node.js, Express, PostgreSQL, bcryptjs, JSON Web Tokens, HTTP-only cookies, OpenAI-compatible Gemini API, CORS, rate limiting, and dotenv.

### Authentication API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Conversation API

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`

### AI Chat API

- `POST /api/chat`

### Account & Trial API

- `GET /api/account/plan`
- `POST /api/trial/start`

The current Premium flow provides a 7-day trial. It is not a paid billing system.

## Selling & Customization

This project can be sold as a customizable source-code product.

A buyer provides their own:
- Brand and logo
- Domain and hosting
- Google Gemini API key and model
- PostgreSQL database
- Authentication provider
- Firebase project, if selected
- Privacy policy and terms
- Payment provider, if paid subscriptions are added
- Production environment variables

The purchase does not include TUBAL HUB's private infrastructure, accounts, API keys, database, Firebase project, or payment accounts.

## Paid Subscriptions

The current Upgrade page supports a 7-day Premium trial only.

For real paid plans, the product needs payment-provider checkout, webhook verification, subscription state synchronization, failed-payment handling, cancellation, customer billing management, and server-side entitlement checks.

## Local Development

Frontend:

```bash
python3 -m http.server 4173
```

Backend:

```bash
cd server
npm install
cp .env.example .env
npm start
```

Configure the backend environment with the buyer's own Google Gemini API key/model, PostgreSQL URL, JWT secret, port, and frontend origin.

## Database

The backend expects PostgreSQL with core tables for users, conversations, and messages. Keep credentials in environment variables.

## Testing

Run:

```bash
npm install
npx playwright install
npm test
```

GitHub Actions runs the frontend smoke tests.

## Security Notes

- Never commit `.env` files or API keys.
- Keep `JWT_SECRET` long and random.
- Keep Gemini API keys on the backend.
- Never place Firebase Admin credentials in frontend files.
- Use HTTPS in production.
- Configure the exact production frontend origin.
- Review authentication, rate limits, database access, privacy, and account deletion before launch.

## Production Status

The frontend and backend integration are prepared, but a buyer must deploy and configure the backend/database for production.

The Upgrade page currently provides a 7-day Premium trial, not real paid recurring subscriptions.

## License

See [LICENSE](LICENSE) and [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Third-party dependencies remain subject to their respective licenses. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
