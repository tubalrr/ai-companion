# AI Companion — Installation Guide

## Requirements
- Modern web browser
- Node.js 22 or compatible current Node.js release
- PostgreSQL
- OpenAI API key for AI chat
- Production web host for the frontend
- Node.js-capable host for the backend
- Optional Firebase project
- Optional payment provider

## 1. Frontend
From the project root:

    python3 -m http.server 4173

Open http://127.0.0.1:4173

For production, host the static frontend on a suitable static hosting provider.

## 2. Backend

    cd server
    npm install

Copy the environment template:

    cp .env.example .env

Configure OPENAI_API_KEY, OPENAI_MODEL, DATABASE_URL, JWT_SECRET, PORT, and FRONTEND_ORIGIN in .env.

Start:

    npm start

Development:

    npm run dev

## 3. Database
Create a PostgreSQL database and apply the project's database schema.

Core tables:
- users
- conversations
- messages

Keep database credentials in environment variables.

## 4. Frontend API Configuration
Set the frontend API base to the public backend URL when frontend and backend are hosted separately.

Example:

    window.AI_COMPANION_API_BASE = "https://api.example.com";

See assets/js/api-config.js.

## 5. OpenAI
Use the buyer's own OpenAI account and place the API key in the backend .env. Never put the OpenAI API key into frontend JavaScript.

## 6. Authentication
The default authentication implementation uses the project's Express/JWT backend.

Firebase Authentication is optional. See assets/js/firebase-auth.js and README.md.

## 7. Production Checklist
- Use HTTPS.
- Configure the production frontend origin.
- Set a strong random JWT secret.
- Configure PostgreSQL backups.
- Keep API keys server-side.
- Test registration, login, logout, chat, conversations, profile, and upgrade flows.
- Review privacy and terms for the buyer's deployment.
- Configure monitoring and error logging.
