# Goa Moments ERP

An internal ops system (tasks, attendance, people, department progress) for
Goa Moments — a standard Next.js app backed by **Firebase** (Firestore for
data, Firebase App Hosting for deploys).

This project previously ran on Cloudflare Workers (via `vinext` + D1) inside
OpenAI's "Sites" hosting platform. It has been migrated off that stack:
Cloudflare Workers/D1/Wrangler/vinext are gone, and the app now runs as a
plain Next.js app you can develop and deploy anywhere Next.js runs, using
Firestore as the database.

## Prerequisites

- Node.js `>=20`
- A Firebase project with **Firestore** enabled ([console.firebase.google.com](https://console.firebase.google.com))
- The [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Point the app at your Firebase project:
   ```bash
   firebase login
   firebase use --add   # pick your project, alias it "default"
   ```
   Also update the placeholder project id in `.firebaserc`.
3. Set up local credentials for the Firebase Admin SDK — see `.env.example`
   for the two supported options (Application Default Credentials, or a
   downloaded service-account key). ADC is the easiest:
   ```bash
   gcloud auth application-default login
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   The app seeds its user roster into Firestore automatically on first
   request (see `ensureErpDatabase()` in `db/erp.ts`) — same behavior as the
   original D1 version.

## Data layer

`db/index.ts` boots the Firebase Admin SDK and exposes `getDb()` (a
Firestore client). `db/erp.ts` contains all business logic — auth, tasks,
attendance, sessions — reimplemented against Firestore collections instead
of D1/SQL tables. Every exported function keeps its original name and
signature, so `app/api/auth/route.ts`, `app/api/erp/route.ts`, and
`app/erp-app.tsx` did not need to change.

Collections used:

| Collection         | Purpose                                             |
|---------------------|------------------------------------------------------|
| `gm_users`          | User accounts (departments stored as an array field) |
| `gm_tasks`           | Tasks, numeric ids minted from a `gm_meta` counter   |
| `gm_task_updates`    | Task status/progress history                        |
| `gm_attendance`      | Daily clock-in/out records                           |
| `gm_sessions`        | Session tokens (doc id = token hash)                 |
| `gm_meta`             | Seed marker + id counters                            |

Since there are only a few dozen users/tasks/attendance rows at a time, most
"scoped" reads (by role/department/date range) fetch the relevant Firestore
range with a single filter and finish the filtering/sorting/joining in
application code, rather than relying on composite indexes. `firestore.rules`
denies all direct client access — the browser never talks to Firestore; only
the Next.js server does, via the Admin SDK.

## Deploying

This app deploys to **Firebase App Hosting**, which supports Next.js SSR
natively:

```bash
firebase deploy --only apphosting
```

See `apphosting.yaml` for build/runtime config. On App Hosting the Admin SDK
authenticates automatically via Application Default Credentials — no service
account key needs to be configured there.

## Diagnostic commands

- `npm run dev` — start the Next.js dev server
- `npm run build` / `npm start` — production build and start
- `npm run lint` — ESLint
- `npm run firebase:emulators` — run the Firestore emulator locally
- `npm run deploy` — deploy to Firebase App Hosting

## Notes on `app/chatgpt-auth.ts`

This file implements optional "Sign in with ChatGPT" support for OpenAI's
Sites hosting platform (reading `oai-authenticated-user-*` headers that Sites
injects). It is **not used anywhere in this app** — the ERP's own
username/password + session-cookie auth (`app/api/auth/route.ts`,
`db/erp.ts`) is what's actually wired up. Since those headers only exist on
Sites, this file is inert once deployed to Firebase App Hosting; it's safe to
delete, or repurpose for **Firebase Authentication** if you'd rather use that
than the built-in password auth.

## Learn More

- [Firebase App Hosting docs](https://firebase.google.com/docs/app-hosting)
- [Firestore docs](https://firebase.google.com/docs/firestore)
- [firebase-admin (Node.js) reference](https://firebase.google.com/docs/reference/admin/node)
