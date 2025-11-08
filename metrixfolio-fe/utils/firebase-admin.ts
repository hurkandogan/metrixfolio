import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!getApps().length) {
  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.',
    );
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson as string)),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

export const adminDb = admin.firestore();
