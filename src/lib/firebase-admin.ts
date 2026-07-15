import * as admin from 'firebase-admin';

export function initFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountStr) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not defined.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountStr);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.error('Firebase admin initialization failed:', err);
    throw err;
  }
}
