# AI Companion — Release Package

## Version

1.0.0

## Release Goal

This release is prepared for distribution as a customizable source-code product.

## Files To Include

Include the application source and these documents:

- index.html
- style.css
- script.js
- assets/
- pages/
- server/
- tests/
- package.json
- playwright.config.js
- LICENSE
- COMMERCIAL-LICENSE.md
- TERMS.md
- PRIVACY.md
- THIRD-PARTY-NOTICES.md
- INSTALLATION.md
- CUSTOMIZATION.md
- CHANGELOG.md
- README.md
- SELLING.md

## Files To Exclude From A Public Release ZIP

Do not include:
- .env
- API keys
- database passwords
- private credentials
- node_modules/
- Playwright browser binaries
- local caches
- temporary files
- personal/private deployment data

## Build A Clean ZIP

From a clean checkout, create a release archive after reviewing the excluded files.

Example:

    zip -r AI-Companion-v1.0.0.zip . -x ".git/*" "node_modules/*" ".env" ".env.*" "*.log"

Review the ZIP manually before uploading it to a storefront.

## Release Verification

Before selling:
1. Open the ZIP and verify all required files are present.
2. Confirm no API keys or private credentials are included.
3. Test the frontend.
4. Test backend startup.
5. Test registration and login.
6. Test AI chat with the buyer's own API key.
7. Test PostgreSQL connection.
8. Test the 7-day trial flow.
9. Review legal pages and contact information.
10. Confirm the buyer license matches the product listing.

## Delivery

Deliver the clean ZIP through the selected digital-product platform. Keep the seller's private infrastructure outside the package.
