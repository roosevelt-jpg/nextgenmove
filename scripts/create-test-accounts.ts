/**
 * Create two ready-to-sign-in test accounts (student + employer).
 * Usage: npx tsx scripts/create-test-accounts.ts
 *
 * Marks email/phone verified and profileComplete so dashboards open without OTP.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const STUDENT = {
  email: "test.student@nextgenmove.agency",
  password: "Nextgen-Student-2026!",
  displayName: "Test Student",
};

const EMPLOYER = {
  email: "test.employer@nextgenmove.agency",
  password: "Nextgen-Employer-2026!",
  displayName: "Test Employer",
  companyName: "Test Employer Co.",
};

function init() {
  if (getApps().length) return;
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
  )?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials in .env.local");
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function ensureAuthUser(
  auth: Auth,
  input: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
  },
) {
  try {
    const existing = await auth.getUserByEmail(input.email);
    await auth.updateUser(existing.uid, {
      password: input.password,
      displayName: input.displayName,
      disabled: false,
      emailVerified: true,
      ...(input.phone ? { phoneNumber: input.phone } : {}),
    });
    return existing.uid;
  } catch {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
      ...(input.phone ? { phoneNumber: input.phone } : {}),
    });
    return created.uid;
  }
}

async function main() {
  init();
  const auth = getAuth();
  const db = getFirestore();
  const now = FieldValue.serverTimestamp();

  const studentUid = await ensureAuthUser(auth, {
    ...STUDENT,
    phone: "+971500000001",
  });
  await auth.setCustomUserClaims(studentUid, { role: "student" });
  await db
    .collection("users")
    .doc(studentUid)
    .set(
      stripUndefined({
        uid: studentUid,
        email: STUDENT.email,
        role: "student",
        displayName: STUDENT.displayName,
        photoUrl: null,
        phone: "+971500000001",
        emailVerified: true,
        phoneVerified: true,
        emailVerifiedAt: now,
        phoneVerifiedAt: now,
        status: "active",
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      }),
      { merge: true },
    );
  await db
    .collection("students")
    .doc(studentUid)
    .set(
      stripUndefined({
        id: studentUid,
        userId: studentUid,
        fullName: STUDENT.displayName,
        email: STUDENT.email,
        phone: "+971500000001",
        nationality: "Netherlands",
        sector: "Tech",
        seniority: "Mid-level",
        currentCity: "Amsterdam",
        targetCities: ["Dubai", "Amsterdam"],
        country: "Netherlands",
        town: "",
        placeId: "",
        bio: "Test student account for Nextgenmove QA.",
        skills: ["TypeScript", "Product"],
        availability: "2 weeks",
        credits: 500,
        plan: null,
        photoUrl: null,
        cvUrl: null,
        linkedinUrl: null,
        portfolioUrl: null,
        githubUrl: null,
        workExperienceEntries: [],
        education: [{ institution: "Test University", degree: "BSc", year: "2022" }],
        workExperience: "Product engineer — 4 years.",
        createdAt: now,
        updatedAt: now,
      }),
      { merge: true },
    );

  const employerUid = await ensureAuthUser(auth, {
    ...EMPLOYER,
    phone: "+971500000002",
  });
  await auth.setCustomUserClaims(employerUid, { role: "company" });
  await db
    .collection("users")
    .doc(employerUid)
    .set(
      stripUndefined({
        uid: employerUid,
        email: EMPLOYER.email,
        role: "company",
        displayName: EMPLOYER.displayName,
        photoUrl: null,
        phone: "+971500000002",
        emailVerified: true,
        phoneVerified: true,
        emailVerifiedAt: now,
        phoneVerifiedAt: now,
        status: "active",
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      }),
      { merge: true },
    );
  await db
    .collection("companies")
    .doc(employerUid)
    .set(
      stripUndefined({
        id: employerUid,
        userId: employerUid,
        name: EMPLOYER.companyName,
        contactName: EMPLOYER.displayName,
        contactEmail: EMPLOYER.email,
        contactPhone: "+971500000002",
        nationality: "United Arab Emirates",
        logoUrl: null,
        industry: "Tech",
        website: "https://www.nextgenmove.agency",
        plan: "track_b",
        subscriptionStatus: "active",
        requirements: [],
        preferredLocations: ["Dubai", "Abu Dhabi"],
        country: "United Arab Emirates",
        city: "Dubai",
        town: "",
        placeId: "",
        requirementTags: [],
        hiringNeeds: "Test employer account for Nextgenmove QA.",
        createdAt: now,
        updatedAt: now,
      }),
      { merge: true },
    );

  console.log("\nTest accounts ready (sign in at https://www.nextgenmove.agency/sign-in)\n");
  console.log("Student");
  console.log(`  Email:    ${STUDENT.email}`);
  console.log(`  Password: ${STUDENT.password}`);
  console.log(`  Portal:   /student/dashboard`);
  console.log("\nEmployer");
  console.log(`  Email:    ${EMPLOYER.email}`);
  console.log(`  Password: ${EMPLOYER.password}`);
  console.log(`  Portal:   /employer/dashboard`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
