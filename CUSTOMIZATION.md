# AI Companion — Customization Guide

## Branding
Update branding assets and visible product name as needed.

Main areas:
- assets/logo.svg
- index.html
- style.css
- script.js
- pages/
- assets/css/
- assets/js/

## API
Configure the backend URL with window.AI_COMPANION_API_BASE.

## AI Provider
The backend uses the OpenAI SDK. Configure the model and API key in server/.env. Never expose API keys in browser code.

## Authentication
The default system uses Express/JWT authentication.

assets/js/firebase-auth.js is an optional Firebase Authentication integration template. Buyers must create and configure their own Firebase project before enabling it.

## Database
Use the buyer's own PostgreSQL database and keep credentials in environment variables.

## Premium
The current Upgrade page provides a 7-day Premium trial. It does not implement real paid recurring billing.

For paid plans, integrate a payment provider and implement server-side subscription state, webhook verification, entitlement checks, cancellation, and billing management.

## Legal Pages
Review and customize TERMS.md, PRIVACY.md, and COMMERCIAL-LICENSE.md. Replace placeholder contact information and deployment-specific statements before public launch.

## Deployment
The frontend can be deployed as static files. The backend must run on a Node.js-capable server with PostgreSQL and the required environment variables.
