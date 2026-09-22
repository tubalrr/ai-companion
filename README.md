# AI Companion

A modern, responsive AI Companion web app with a futuristic glassmorphism interface, account authentication, cloud conversation storage, and an OpenAI-powered chat backend.

This repository is structured as a **distributable/customizable software project**. Buyers or developers can configure their own backend, database, AI provider credentials, authentication provider, branding, and hosting.

## Live Demo

[AI Companion on GitHub Pages](https://tubalrr.github.io/ai-companion/index.html)

> **Deployment note:** The GitHub Pages frontend is static. The Node.js backend, PostgreSQL database, OpenAI API, and any paid subscription checkout must be deployed/configured separately for production use.

## Features

- Futuristic dark glassmorphism UI
- Responsive desktop and mobile design
- Desktop-style AI chat composer on mobile
- New Chat workflow
- Clickable AI suggestion cards
  - Plan my day
  - Get creative
  - Teach me
  - Help me write
- Local recent conversation history
- Conversation actions: pin, rename, share, archive, delete
- Account registration and login
- HTTP-only JWT authentication
- Cloud conversations and messages with PostgreSQL
- OpenAI-powered AI responses through the secure backend
- 7-day Premium trial flow
- Profile, Settings, Help, Library, Projects, Scheduled, Coding, and Upgrade pages
- Shared visual theme across pages
- Optional Firebase Authentication integration file
- GitHub Actions smoke testing with Playwright

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
│   ├── profile.html
│   ├── settings.html
│   ├── upgrade.html
│   ├── help.html
│   ├── login.html
│   ├── signup.html
│   ├── library.html
│   ├── projects.html
│   ├── scheduled.html
│   ├── coding.html
│   └── project-workspace.html
├── server/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── tests/
├── package.json
└── playwright.config.js
```

## Frontend

The frontend is static HTML/CSS/JavaScript with the main dashboard UI in the root files.

The API base can be configured through:

```js
window.AI_COMPANION_API_BASE = "https://your-api.example.com";
```

See `assets/js/api-config.js`.

When the API is not configured, the public dashboard can still load, but authenticated AI chat and cloud features require the backend.

## Authentication

The project currently includes its own Express/JWT authentication flow:

- Registration
- Login
- Logout
- Current-account check
- HTTP-only authentication cookie
- PostgreSQL account storage

An optional `assets/js/firebase-auth.js` file is also included for projects that want to use Firebase Authentication.

### Firebase Authentication

Firebase Auth is **optional** and is not required for the default Express/JWT authentication system.

The Firebase file is provided as an integration/template layer. Before enabling it, the buyer/developer should:

1. Create their own Firebase project.
2. Enable the required Firebase Authentication providers.
3. Add their own Firebase web configuration.
4. Add their production domain to Firebase Authentication authorized domains.
5. Wire the Firebase client to the desired Login/Signup flow.
6. If Firebase users will access the Node.js backend, implement server-side Firebase ID-token verification and account mapping.

Do not add Firebase Admin SDK private keys, service-account credentials, or other server secrets to frontend files.

## Backend

The backend is located in `server/` and uses:

- Node.js
- Express
- PostgreSQL
- bcryptjs
- JSON Web Tokens
- HTTP-only cookies
- OpenAI SDK
- CORS
- Express rate limiting
- dotenv

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

The chat endpoint requires authentication and uses the configured OpenAI API key on the server.

### Account & Trial API

- `GET /api/account/plan`
- `POST /api/trial/start`

The current Premium flow provides a **7-day trial**. It is not a paid billing system.

## Selling & Customization

This repository can be used as a software product, starter project, or customized AI Companion solution.

A buyer/developer should configure their own:

- Brand name and logo
- Domain and hosting
- OpenAI API key and model
- PostgreSQL database
- Authentication provider
- Firebase project, if Firebase Auth is selected
- Privacy policy and terms
- Email/account recovery services
- Payment provider, if paid subscriptions are offered
- Production environment variables

The included Firebase web configuration is intentionally a placeholder. Buyers should use their own Firebase project rather than the seller's project.

### Paid Subscriptions

The current Upgrade page supports a **7-day Premium trial only**.

For real paid plans, the product still needs:

- Payment provider checkout
- Monthly/yearly pricing
- Webhook verification
- Subscription status synchronization
- Failed-payment handling
- Cancellation flow
- Customer billing portal
- Server-side entitlement checks

Do not advertise the current trial flow as an active recurring payment system.

## Local Development

### Frontend

From the repository root:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

### Backend

```bash
cd server
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

Configure the required values:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.6-luna
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000
FRONTEND_ORIGIN=http://localhost:3000
```

Start the backend:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Database

The backend expects PostgreSQL.

Core tables:

- `users`
- `conversations`
- `messages`

The database schema also supports Premium trial state on the `users` table.

For production, use a managed PostgreSQL database and keep credentials in environment variables rather than committing them to Git.

## Testing

The repository includes Playwright smoke tests and GitHub Actions CI.

Run:

```bash
npm install
npx playwright install
npm test
```

The CI workflow starts a local static server and runs the production smoke tests against the frontend.

## Security Notes

- Never commit `.env` files or API keys.
- Keep `JWT_SECRET` long and random.
- Keep the OpenAI API key on the backend only.
- Never place Firebase Admin SDK credentials in frontend files.
- Use HTTPS for production.
- Configure `FRONTEND_ORIGIN` to the exact production frontend origin.
- Review authentication, rate limits, database access, privacy, and account deletion behavior before a public production launch.

## Production Status

The project contains a frontend foundation and backend integration, but the backend and database still need to be hosted and configured for a complete production deployment.

The current Upgrade page provides a **7-day Premium trial**, not real paid subscriptions.

## License

See [LICENSE](LICENSE).

Third-party dependencies remain subject to their respective licenses. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
