import * as admin from 'firebase-admin'

const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const adminClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const adminPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

// Initialize Firebase Admin SDK
const initializeAdminApp = () => {
  const apps = (admin as any).apps as any[]
  if (apps && apps.length > 0) {
    return (admin as any).app()
  }
  return (admin as any).initializeApp({
    credential: (admin as any).credential.cert({
      projectId: adminProjectId,
      clientEmail: adminClientEmail,
      privateKey: adminPrivateKey,
    }),
  })
}

const adminApp = initializeAdminApp()

export const adminDb = (admin as any).firestore(adminApp)
export const adminAuth = (admin as any).auth(adminApp)
export const adminStorage = (admin as any).storage(adminApp)
