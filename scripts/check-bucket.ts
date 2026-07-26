import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { adminStorage } = await import("../src/lib/firebase-admin");
  const name = "nextgenmove-c4179.firebasestorage.app";
  try {
    const [exists] = await adminStorage.bucket(name).exists();
    console.log(`${name} -> exists: ${exists}`);
    if (exists) {
      const file = adminStorage.bucket(name).file("diagnostics/access-check.txt");
      await file.save("ok", { resumable: false });
      await file.delete();
      console.log("write test: ok");
    }
  } catch (error) {
    console.log(`${name} -> error: ${(error as Error).message}`);
  }
}

main().then(() => process.exit(0));
