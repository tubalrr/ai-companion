# AI Companion

A modern, responsive AI Companion web app with a futuristic glassmorphism interface, real account authentication, cloud conversation storage, and an OpenAI-powered chat backend.

## Live Demo

[AI Companion on GitHub Pages](https://tubalrr.github.io/ai-companion/index.html)

> **Current deployment note:** The GitHub Pages frontend is static. The Node.js backend, PostgreSQL database, OpenAI API, and paid subscription checkout must be deployed/configured separately for full production functionality.

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
- Premium trial flow
- Profile, Settings, Help, Library, Projects, Scheduled, Coding, and Upgrade pages
- Shared visual theme across pages
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

### Authentication

Available API routes include:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Conversations

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`

### AI Chat

- `POST /api/chat`

The chat endpoint requires authentication and uses the configured OpenAI API key on the server.

### Account & Trial

- `GET /api/account/plan`
- `POST /api/trial/start`

The current Premium flow provides a 7-day trial. **It is not a paid billing system yet.** A real payment provider and subscription management flow are still required before selling recurring plans.

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
- Use HTTPS for production.
- Configure `FRONTEND_ORIGIN` to the exact production frontend origin.
- Review authentication, rate limits, database access, privacy, and account deletion behavior before a public production launch.

## Important Production Status

The project has a working frontend foundation and backend integration, but it should not be represented as a fully deployed SaaS product until the backend and database are hosted and configured.

The current Upgrade page supports a **7-day Premium trial**, not real paid subscriptions. A payment provider, recurring billing, webhook handling, subscription state management, and customer billing portal still need to be added for actual paid plans.

## License

See [LICENSE](LICENSE).

Third-party dependencies remain subject to their respective licenses. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
