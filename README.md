# Didit Demo Center

This repository contains demos showcasing how to integrate Didit's identity verification and authentication solutions.

## Live Demo
The demo is deployed at: [https://demos.didit.me](https://demos.didit.me)

## Solutions Showcased
### 1. Didit Identity Verification
Demonstrates how to integrate:
- **Document Verification**
- **Face Verification / Biometric process**

For a more detailed implementation, refer to the full demo repository: [Didit Full Demo](https://github.com/didit-protocol/didit-full-demo).

### 2. Didit Auth + Data Solution
This solution covers:
- **Sign In Solution** – Authenticate users seamlessly.
- **Data Transfer Solution** – Enable secure data sharing.

## Technical Documentation
More technical details can be found at: [https://docs.didit.me](https://docs.didit.me)

## Running This Repository Locally

1. Clone the repository and navigate to the project directory.
2. Copy `.env.example` and rename it to `.env`.
3. Fill in the required values using the credentials from the application you created in the [Didit Business Console](https://business.didit.me):
   - Navigate to `Users -> Settings -> Redirection URI`
   - Ensure the redirect URI is correctly added

### `.env.example`:
```ini
NEXT_PUBLIC_DIDIT_CLIENT_ID=
DIDIT_CLIENT_SECRET=
NEXT_PUBLIC_REDIRECT_URI=https://demos.didit.me/
NEXT_PUBLIC_IS_STAGING=false
```

4. Install dependencies and start the development server:
   ```sh
   npm install
   npm run dev
   ```

Now, you're ready to explore the Didit integration in action!
