/**
 * Static checks for role-based route protection mapping.
 * Run: npx tsx scripts/verify-rbac.ts
 */
import {
  getRequiredRoleForPath,
  PORTAL_HOME,
} from "../src/lib/auth/constants";
import {
  getRequiredRoleForApiPath,
  roleMayAccessApiPath,
} from "../src/lib/security/tenant-boundary";

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

const apiCases = [
  { path: "/api/admin/users", role: "admin" as const },
  { path: "/api/employer/matches", role: "company" as const },
  { path: "/api/student/store/purchase", role: "student" as const },
  { path: "/api/health", role: null },
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

for (const testCase of apiCases) {
  const required = getRequiredRoleForApiPath(testCase.path);
  if (required !== testCase.role) {
    console.error(
      `FAIL API ${testCase.path}: expected ${testCase.role}, got ${required}`,
    );
    failed += 1;
  } else {
    console.log(`OK   API ${testCase.path} → ${required ?? "public"}`);
  }
}

if (roleMayAccessApiPath("company", "/api/employer/matches") !== true) {
  console.error("FAIL company cannot access own employer API");
  failed += 1;
}

if (roleMayAccessApiPath("company", "/api/admin/users") !== false) {
  console.error("FAIL company must not access admin API");
  failed += 1;
}

if (roleMayAccessApiPath("student", "/api/employer/matches") !== false) {
  console.error("FAIL student must not access employer API");
  failed += 1;
}

for (const role of ["admin", "company", "student"] as const) {
  console.log(`OK   portal home ${role} → ${PORTAL_HOME[role]}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log("\nRBAC route + API map verified.");
