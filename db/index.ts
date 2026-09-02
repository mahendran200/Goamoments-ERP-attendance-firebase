import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin bootstrap. Call getDb() anywhere you need Firestore.
 *
 * Credentials (checked in this order):
 *  1. FIREBASE_SERVICE_ACCOUNT env var — a full service-account JSON blob
 *     (stringified). Handy for platforms where you paste secrets as env vars.
 *  2. GOOGLE_APPLICATION_CREDENTIALS — path to a service-account JSON file.
 *     Handled automatically by initializeApp() with no arguments.
 *  3. Application Default Credentials — the default when running on Firebase
 *     App Hosting, Cloud Run, or Cloud Functions; also works locally after
 *     `gcloud auth application-default login`.
 *
 * See .env.example for local setup instructions.
 */

let app: App | null = null;
let firestore: Firestore | null = null;

function ensureApp(): App {
  if (app) return app;

  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    app = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } else {
    // Uses GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials.
    app = initializeApp();
  }

  return app;
}

export function getDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(ensureApp());
  return firestore;
}
