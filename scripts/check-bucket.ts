import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { adminStorage } = await import("../src/lib/firebase-admin");
  const name =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "nextgenmove-1744b.firebasestorage.app";
  try {
    const [exists] = await adminStorage.bucket(name).exists();
    console.log(`${name} -> exists: ${exists}`);
  } catch (error) {
    console.log(`${name} -> error: ${(error as Error).message}`);
  }
}

main().then(() => process.exit(0));
