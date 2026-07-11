import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

interface AdminServices {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

let cachedServices: AdminServices | null = null;

function createAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
  )?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : undefined);

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
}

function getAdminServices(): AdminServices {
  if (!cachedServices) {
    const app = createAdminApp();
    cachedServices = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
    };
  }

  return cachedServices;
}

function createServiceProxy<T extends object>(selector: (services: AdminServices) => T): T {
  return new Proxy({} as T, {
    get(_target, property, receiver) {
      const service = selector(getAdminServices());
      const value = Reflect.get(service, property, receiver);

      if (typeof value === "function") {
        return value.bind(service);
      }

      return value;
    },
  });
}

export const adminAuth = createServiceProxy((services) => services.auth);
export const adminDb = createServiceProxy((services) => services.db);
export const adminStorage = createServiceProxy((services) => services.storage);
