/**
 * Static checks for role-based route protection mapping.
 * Run: npx tsx scripts/verify-rbac.ts
 */
import {
  getRequiredRoleForPath,
  PORTAL_HOME,
} from "../src/lib/auth/constants";

const cases = [
  { path: "/admin", role: "admin" as const },
  { path: "/admin/crm", role: "admin" as const },
  { path: "/employer", role: "company" as const },
  { path: "/employer/pipeline", role: "company" as const },
  { path: "/student", role: "student" as const },
  { path: "/student/store", role: "student" as const },
  { path: "/pricing", role: null },
  { path: "/sign-in", role: null },
];

let failed = 0;

for (const testCase of cases) {
  const required = getRequiredRoleForPath(testCase.path);
  if (required !== testCase.role) {
    console.error(`FAIL ${testCase.path}: expected ${testCase.role}, got ${required}`);
    failed += 1;
  } else {
    console.log(`OK   ${testCase.path} → ${required ?? "public"}`);
  }
}

for (const role of ["admin", "company", "student"] as const) {
  console.log(`OK   portal home ${role} → ${PORTAL_HOME[role]}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log("\nRBAC route map verified.");
