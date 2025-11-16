# Didit Demo Center

This repository contains a streamlined demo for integrating Didit's identity verification workflows.

## Live Demo

The demo is deployed at: https://demos.didit.me

## Workflows Showcased

The demo includes multiple verification workflows such as:

- Core KYC (Free)
- Enhanced Compliance (KYC + AML)
- Liveness Check Only
- Biometric Authentication (requires user-provided portrait image for face match)
- Multi-Factor Verification
- Adaptive Age Verification (example triggers full ID check if estimated age is 15–25)
- Proof of Address (PoA)

Each workflow can be fully customized in the Didit Business Console. Switch between workflows in the UI to see different configurations and required steps.

## Didit CAPTCHA

The demo also includes a **Didit CAPTCHA** component — a bot-resistant CAPTCHA powered by liveness verification. Users complete a quick face check instead of solving puzzles, providing a better user experience while maintaining security.

To use Didit CAPTCHA, you'll need to create a liveness-only workflow in the Didit Business Console and set the `DIDIT_LIVENESS_WORKFLOW_ID` environment variable.

## Workflow IDs

You will need Workflow IDs to run the flows in your own environment.

1. Go to the Didit Business Console: https://business.didit.me
2. Create a free account (or sign in)
3. Create a new workflow or open an existing one
4. Copy the Workflow ID from the workflow details screen

Then update the demo’s config at `lib/workflows.ts` by replacing the placeholder IDs with your Workflow IDs.

## Technical Documentation

Docs: https://docs.didit.me

## Run Locally

1. Clone the repository and navigate to the project directory.
2. Copy `.env.example` to `.env`.
3. Fill in `API_KEY` with the credentials from your app in the console (business.didit.me).
4. Create or use the predefined workflows in your application and replace the placeholder IDs in `lib/workflows.ts` with your own.
5. Install dependencies and start the dev server:
   ```sh
   npm install
   npm run dev
   ```

### `.env.example`

```ini
API_KEY=same-as-didit-client-secret
NEXT_PUBLIC_REDIRECT_URI=https://demos.didit.me/
NEXT_PUBLIC_IS_STAGING=false
DIDIT_LIVENESS_WORKFLOW_ID=your-liveness-only-workflow-id
```

**Note:** `DIDIT_LIVENESS_WORKFLOW_ID` is optional and only needed if you want to use the Didit CAPTCHA feature. Create a liveness-only workflow in the Didit Business Console and use its ID here.

## Notes & Tips

- Sessions: In this demo, session results are available for a limited time window. If you receive HTTP 410 (Gone), create a new session and try again.
- Security: `API_KEY` is used only on server-side API routes and must never be exposed client-side.
- Biometric Authentication: This workflow requires a `portrait_image` (Base64, max 1MB) to perform face match when enabled.
- Didit CAPTCHA: Requires a liveness-only workflow. Create one in the Didit Business Console and set `DIDIT_LIVENESS_WORKFLOW_ID` in your `.env` file.

## Create a Free Account

Get started in minutes at https://business.didit.me — create workflows, copy their IDs, and plug them into this demo.
