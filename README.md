This is a Next.js app.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Firebase Admin configuration

Create a `.env.local` with the following variables (do not commit secrets):

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-XXXXX@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC...XYZ\n-----END PRIVATE KEY-----\n"

# Optional
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

On Windows, ensure newlines in `FIREBASE_PRIVATE_KEY` are encoded as `\n`.
