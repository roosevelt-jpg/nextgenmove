/**
 * Opt-in DEMO entity seed — fills dashboards to match gaps.zip mockups.
 *
 * Usage:  npm run seed:demo
 *
 * Creates Auth users + Firestore entities. Safe to re-run (upserts by email / fixed ids).
 * Does NOT replace operational seed (npm run seed) — run that first if CMS shells are empty.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const DEMO_PASSWORD = "Demo-Pass-123!";

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
  input: { email: string; password: string; displayName: string },
) {
  try {
    const existing = await auth.getUserByEmail(input.email);
    await auth.updateUser(existing.uid, {
      password: input.password,
      displayName: input.displayName,
      disabled: false,
      emailVerified: true,
    });
    return existing.uid;
  } catch {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function writeUser(
  db: Firestore,
  uid: string,
  data: {
    email: string;
    role: "student" | "company" | "admin";
    displayName: string;
  },
) {
  await db
    .collection("users")
    .doc(uid)
    .set(
      stripUndefined({
        uid,
        email: data.email,
        role: data.role,
        displayName: data.displayName,
        photoUrl: null,
        status: "active",
        profileComplete: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: null,
      }),
      { merge: true },
    );
}

const TALENT = [
  {
    email: "sara.kowalski@Nextgenmove.demo",
    fullName: "Sara Kowalski",
    sector: "Marketing",
    seniority: "Mid-level",
    currentCity: "Amsterdam",
    targetCities: ["Dubai", "Amsterdam"],
    skills: ["Brand strategy", "Content"],
    matchScore: 94,
    bio: "Marketing lead relocating to the Gulf corridor.",
    availability: "2 weeks",
  },
  {
    email: "jonas.lange@Nextgenmove.demo",
    fullName: "Jonas Lange",
    sector: "Finance",
    seniority: "Senior",
    currentCity: "Berlin",
    targetCities: ["Dubai", "Abu Dhabi"],
    skills: ["Financial analysis", "FP&A"],
    matchScore: 88,
    bio: "Finance analyst with EU → MENA focus.",
    availability: "Immediate",
  },
  {
    email: "amira.mourad@Nextgenmove.demo",
    fullName: "Amira Mourad",
    sector: "Operations",
    seniority: "Mid-level",
    currentCity: "Cairo",
    targetCities: ["Dubai", "Riyadh"],
    skills: ["Ops excellence", "Process design"],
    matchScore: 91,
    bio: "Operations specialist ready for Gulf placement.",
    availability: "1 month",
  },
  {
    email: "piotr.vanlaan@Nextgenmove.demo",
    fullName: "Piotr Vanlaan",
    sector: "Tech",
    seniority: "Senior",
    currentCity: "Warsaw",
    targetCities: ["Dubai", "Amsterdam"],
    skills: ["Full-stack", "Cloud"],
    matchScore: 85,
    bio: "Engineer targeting Track B coaching path.",
    availability: "2 weeks",
  },
  {
    email: "lea.bernard@Nextgenmove.demo",
    fullName: "Léa Bernard",
    sector: "HR",
    seniority: "Mid-level",
    currentCity: "Paris",
    targetCities: ["Dubai"],
    skills: ["Talent acquisition", "People ops"],
    matchScore: 79,
    bio: "People partner exploring Dubai roles.",
    availability: "1 month",
  },
  {
    email: "carlos.neves@Nextgenmove.demo",
    fullName: "Carlos Neves",
    sector: "Sales",
    seniority: "Senior",
    currentCity: "Lisbon",
    targetCities: ["Dubai", "Lisbon"],
    skills: ["Enterprise sales", "SaaS"],
    matchScore: 82,
    bio: "Sales lead with Gulf corridor interest.",
    availability: "Immediate",
  },
] as const;

const COMPANIES = [
  {
    email: "employer@Nextgenmove.demo",
    name: "Nordbridge Logistics",
    contactName: "Helen Park",
    industry: "Logistics",
    plan: "track_b",
    crmDealStage: "new",
    primary: true,
  },
  {
    email: "atlas@Nextgenmove.demo",
    name: "Atlas Retail Group",
    contactName: "Omar Said",
    industry: "Retail",
    plan: "track_a",
    crmDealStage: "new",
  },
  {
    email: "meridian@Nextgenmove.demo",
    name: "Meridian Bank",
    contactName: "Claire Ng",
    industry: "Finance",
    plan: "track_b",
    crmDealStage: "contacted",
  },
  {
    email: "solace@Nextgenmove.demo",
    name: "Solace Health",
    contactName: "Dr. Yasmin Ali",
    industry: "Healthcare",
    plan: "track_a",
    crmDealStage: "contacted",
  },
  {
    email: "vantage@Nextgenmove.demo",
    name: "Vantage Energy",
    contactName: "Tom Reeves",
    industry: "Energy",
    plan: "track_b",
    crmDealStage: "qualified",
  },
  {
    email: "nextgenmove.retail@Nextgenmove.demo",
    name: "Nextgenmove Retail Co.",
    contactName: "Nextgenmove",
    industry: "Retail",
    plan: "track_b",
    crmDealStage: "won",
  },
] as const;

const CONTENT = [
  {
    id: "demo_mock_interview",
    title: "Mock interview",
    type: "coaching" as const,
    category: "Coaching",
    costCredits: 200,
    priceEur: 50,
    description: "1:1 mock interview with placement coach feedback.",
  },
  {
    id: "demo_linkedin_polish",
    title: "LinkedIn polish",
    type: "premium" as const,
    category: "Profile",
    costCredits: 80,
    priceEur: 20,
    description: "Profile rewrite for Gulf corridor employers.",
  },
  {
    id: "demo_cv_review",
    title: "CV review",
    type: "premium" as const,
    category: "Profile",
    costCredits: 80,
    priceEur: 20,
    description: "CV annotated against target role requirements.",
  },
  {
    id: "demo_salary_webinar",
    title: "Salary negotiation webinar",
    type: "webinar" as const,
    category: "Webinars",
    costCredits: 80,
    priceEur: 20,
    description: "Live webinar on offer negotiation in the UAE.",
  },
];

async function main() {
  init();
  const auth = getAuth();
  const db = getFirestore();
  const now = FieldValue.serverTimestamp();
  const log: string[] = [];

  // --- Primary demo student (journey: Interviewing, 2100 credits) ---
  const studentUid = await ensureAuthUser(auth, {
    email: "student@Nextgenmove.demo",
    password: DEMO_PASSWORD,
    displayName: "Demo Student",
  });
  await writeUser(db, studentUid, {
    email: "student@Nextgenmove.demo",
    role: "student",
    displayName: "Demo Student",
  });
  await db
    .collection("students")
    .doc(studentUid)
    .set(
      stripUndefined({
        id: studentUid,
        userId: studentUid,
        fullName: "Demo Student",
        email: "student@Nextgenmove.demo",
        photoUrl: null,
        sector: "Marketing",
        seniority: "Mid-level",
        currentCity: "Amsterdam",
        targetCities: ["Dubai", "Amsterdam"],
        cvUrl: "https://example.com/demo-cv.pdf",
        linkedinUrl: "https://linkedin.com/in/demo-student",
        portfolioUrl: null,
        bio: "Demo student used for portal walkthroughs.",
        skills: ["Brand strategy", "Content", "Campaigns"],
        availability: "2 weeks",
        credits: 2100,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }),
      { merge: true },
    );
  log.push(`student ${studentUid} student@Nextgenmove.demo`);

  // --- Talent pool students ---
  const talentUids: { uid: string; score: number; email: string }[] = [];
  for (const t of TALENT) {
    const uid = await ensureAuthUser(auth, {
      email: t.email,
      password: DEMO_PASSWORD,
      displayName: t.fullName,
    });
    await writeUser(db, uid, {
      email: t.email,
      role: "student",
      displayName: t.fullName,
    });
    await db
      .collection("students")
      .doc(uid)
      .set(
        stripUndefined({
          id: uid,
          userId: uid,
          fullName: t.fullName,
          email: t.email,
          photoUrl: null,
          sector: t.sector,
          seniority: t.seniority,
          currentCity: t.currentCity,
          targetCities: [...t.targetCities],
          cvUrl: null,
          linkedinUrl: null,
          portfolioUrl: null,
          bio: t.bio,
          skills: [...t.skills],
          availability: t.availability,
          credits: 500,
          status: "active",
          createdAt: now,
          updatedAt: now,
        }),
        { merge: true },
      );
    talentUids.push({ uid, score: t.matchScore, email: t.email });
  }
  log.push(`talent students ${talentUids.length}`);

  // Extra active students so admin counts feel populated (Auth + docs)
  for (let i = 1; i <= 18; i++) {
    const email = `candidate${String(i).padStart(2, "0")}@Nextgenmove.demo`;
    const uid = await ensureAuthUser(auth, {
      email,
      password: DEMO_PASSWORD,
      displayName: `Candidate ${i}`,
    });
    await writeUser(db, uid, {
      email,
      role: "student",
      displayName: `Candidate ${i}`,
    });
    await db
      .collection("students")
      .doc(uid)
      .set(
        stripUndefined({
          id: uid,
          userId: uid,
          fullName: `Candidate ${i}`,
          email,
          photoUrl: null,
          sector: ["Marketing", "Finance", "Tech", "Operations"][i % 4],
          seniority: ["Junior", "Mid-level", "Senior"][i % 3],
          currentCity: ["Berlin", "Madrid", "Rome", "Prague"][i % 4],
          targetCities: ["Dubai"],
          cvUrl: null,
          linkedinUrl: null,
          portfolioUrl: null,
          bio: "Demo candidate profile.",
          skills: ["Communication"],
          availability: "1 month",
          credits: 200,
          status: i % 7 === 0 ? "placed" : "active",
          createdAt: now,
          updatedAt: now,
        }),
        { merge: true },
      );
  }
  log.push("extra candidates 18");

  // --- Companies ---
  let primaryCompanyUid = "";
  for (const c of COMPANIES) {
    const uid = await ensureAuthUser(auth, {
      email: c.email,
      password: DEMO_PASSWORD,
      displayName: c.name,
    });
    if ("primary" in c && c.primary) primaryCompanyUid = uid;
    await writeUser(db, uid, {
      email: c.email,
      role: "company",
      displayName: c.name,
    });
    await db
      .collection("companies")
      .doc(uid)
      .set(
        stripUndefined({
          id: uid,
          userId: uid,
          name: c.name,
          contactName: c.contactName,
          contactEmail: c.email,
          logoUrl: null,
          industry: c.industry,
          website: `https://example.com/${c.name.toLowerCase().replace(/\s+/g, "-")}`,
          plan: c.plan,
          subscriptionStatus: "active",
          requirements: [],
          preferredLocations: ["Dubai", "Abu Dhabi"],
          requirementTags: [],
          hiringNeeds: "Gulf corridor placements",
          crmDealStage: c.crmDealStage,
          crmOwner: "Admin",
          createdAt: now,
          updatedAt: now,
        }),
        { merge: true },
      );
  }
  if (!primaryCompanyUid) primaryCompanyUid = (await auth.getUserByEmail("employer@Nextgenmove.demo")).uid;
  log.push(`companies ${COMPANIES.length}; primary ${primaryCompanyUid}`);

  // --- Matches (talent pool + pipeline stages) ---
  const stages = [
    "pipeline_new_match",
    "pipeline_intro_sent",
    "pipeline_interviewing",
    "pipeline_offer",
    "pipeline_placed",
  ];
  for (let i = 0; i < talentUids.length; i++) {
    const t = talentUids[i]!;
    const matchId = `demo_match_${t.uid.slice(0, 8)}`;
    const stageId = i === 0 ? "pipeline_interviewing" : stages[i % 3]!;
    await db
      .collection("matches")
      .doc(matchId)
      .set(
        stripUndefined({
          companyId: primaryCompanyUid,
          studentId: t.uid,
          stageId,
          shortlisted: i < 2,
          shortlistRank: i < 2 ? i + 1 : null,
          matchScore: t.score,
          source: "admin_curated",
          notes: [],
          createdAt: now,
          updatedAt: now,
        }),
        { merge: true },
      );
  }

  // Demo student journey match → Interviewing
  await db
    .collection("matches")
    .doc(`demo_match_student_${studentUid.slice(0, 8)}`)
    .set(
      stripUndefined({
        companyId: primaryCompanyUid,
        studentId: studentUid,
        stageId: "pipeline_interviewing",
        shortlisted: true,
        shortlistRank: 1,
        matchScore: 90,
        source: "admin_curated",
        notes: [
          {
            authorId: "system",
            text: "Intro call completed — coaching toward offer.",
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: now,
        updatedAt: now,
      }),
      { merge: true },
    );

  // A few placed matches for admin "placed this quarter"
  for (let i = 0; i < 4; i++) {
    const t = talentUids[i % talentUids.length]!;
    const companyEmail = COMPANIES[(i + 1) % COMPANIES.length]!.email;
    const companyUid = (await auth.getUserByEmail(companyEmail)).uid;
    await db
      .collection("matches")
      .doc(`demo_placed_${i}`)
      .set(
        stripUndefined({
          companyId: companyUid,
          studentId: t.uid,
          stageId: "pipeline_placed",
          shortlisted: true,
          shortlistRank: null,
          matchScore: 80 + i,
          source: "admin_curated",
          notes: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
  }
  log.push("matches created");

  // --- Content library ---
  for (const item of CONTENT) {
    await db
      .collection("content_items")
      .doc(item.id)
      .set(
        stripUndefined({
          id: item.id,
          title: item.title,
          type: item.type,
          description: item.description,
          thumbnailUrl: "",
          fileUrl: "https://example.com/demo-content.pdf",
          costCredits: item.costCredits,
          priceEur: item.priceEur,
          emojiIcon: "",
          linkUrl: "",
          category: item.category,
          status: "live",
          createdAt: now,
        }),
        { merge: true },
      );
  }
  log.push(`content_items ${CONTENT.length}`);

  // --- Homepage media ---
  const videos = [
    {
      id: "demo_video_1",
      title: "From Amsterdam to Dubai in 6 weeks",
      subtitle: "Sara K. · Marketing Lead",
      duration: "3:12",
      position: 1,
    },
    {
      id: "demo_video_2",
      title: "Meet your coach",
      subtitle: "Founder & Coach",
      duration: "2:04",
      position: 2,
    },
    {
      id: "demo_video_3",
      title: "What Track B actually looks like",
      subtitle: "Nordbridge Logistics",
      duration: "4:47",
      position: 3,
    },
  ];
  for (const v of videos) {
    await db
      .collection("video_cards")
      .doc(v.id)
      .set(
        stripUndefined({
          ...v,
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "",
          status: "live",
        }),
        { merge: true },
      );
  }
  const pods = [
    {
      id: "demo_pod_12",
      episodeNumber: 12,
      title: "Negotiating your first Dubai offer",
      guestName: "Piotr Nowak",
      duration: "34 min",
    },
    {
      id: "demo_pod_11",
      episodeNumber: 11,
      title: "The paperwork nobody tells you about",
      guestName: "Amira Youssef",
      duration: "41 min",
    },
    {
      id: "demo_pod_10",
      episodeNumber: 10,
      title: "Why we built Track A and Track B",
      guestName: "Nextgenmove",
      duration: "28 min",
    },
    {
      id: "demo_pod_09",
      episodeNumber: 9,
      title: "Visa timelines that actually hold",
      guestName: "Nadia Rahman",
      duration: "32 min",
    },
    {
      id: "demo_pod_08",
      episodeNumber: 8,
      title: "What employers look for in the pool",
      guestName: "Omar Haddad",
      duration: "36 min",
    },
    {
      id: "demo_pod_07",
      episodeNumber: 7,
      title: "Credits, coaching, and your first ninety days",
      guestName: "Sofia Mendes",
      duration: "29 min",
    },
  ];
  for (const p of pods) {
    await db
      .collection("podcast_episodes")
      .doc(p.id)
      .set(
        stripUndefined({
          ...p,
          audioUrl: "https://example.com/demo-episode.mp3",
          description: "Demo podcast episode for homepage Stories/Podcast sections.",
          status: "live",
        }),
        { merge: true },
      );
  }
  log.push("video_cards + podcast_episodes");

  // --- Public listings ---
  await db
    .collection("articles")
    .doc("demo_article_corridor")
    .set(
      stripUndefined({
        title: "How the Gulf corridor hiring wave works",
        slug: "gulf-corridor-hiring-wave",
        coverImageUrl: "",
        excerpt: "What employers actually screen for in Dubai and Abu Dhabi.",
        body: "<p>Demo journal article seeded for the public Journal page.</p>",
        author: "Nextgenmove",
        category: "Insights",
        publishedDate: new Date().toISOString().slice(0, 10),
        tags: ["Dubai", "Hiring"],
        status: "published",
        createdAt: now,
      }),
      { merge: true },
    );

  await db
    .collection("job_postings")
    .doc("demo_job_ops")
    .set(
      stripUndefined({
        title: "Operations Associate — Dubai",
        department: "Operations",
        location: "Dubai, UAE",
        employmentType: "Full-time",
        description: "Demo careers posting for Nordbridge Logistics.",
        status: "open",
        createdAt: now,
      }),
      { merge: true },
    );

  await db
    .collection("public_roles")
    .doc("demo_role_marketing")
    .set(
      stripUndefined({
        title: "Marketing Lead — Gulf corridor",
        employerLabel: "Confidential employer",
        sector: "Marketing",
        location: "Dubai",
        seniority: "Mid-level",
        relocationSupport: true,
        description: "Demo browse-roles listing with relocation support.",
        status: "open",
        createdAt: now,
      }),
      { merge: true },
    );
  log.push("articles / jobs / public_roles");

  // --- Pending inbound ---
  await db
    .collection("requests")
    .doc("demo_req_sourcing")
    .set(
      stripUndefined({
        type: "sourcing",
        status: "pending",
        createdAt: now,
        payload: {
          companyName: "Nordbridge Logistics",
          contactName: "Helen Park",
          contactEmail: "employer@Nextgenmove.demo",
          roleTitleNeeded: "Operations Lead — Dubai",
          type: "sourcing",
        },
      }),
      { merge: true },
    );
  await db
    .collection("job_applications")
    .doc("demo_app_1")
    .set(
      stripUndefined({
        jobPostingId: "demo_job_ops",
        fullName: "Maya Chen",
        email: "maya.chen@example.com",
        linkedinUrl: null,
        cvUrl: "https://example.com/maya-cv.pdf",
        coverNote: "Excited about Gulf corridor ops roles.",
        status: "new",
        createdAt: now,
      }),
      { merge: true },
    );
  await db
    .collection("role_interest_submissions")
    .doc("demo_interest_1")
    .set(
      stripUndefined({
        roleId: "demo_role_marketing",
        fullName: "Ibrahim Hassan",
        email: "ibrahim@example.com",
        status: "new",
        createdAt: now,
      }),
      { merge: true },
    );
  log.push("pending requests / applications / interest");

  // --- Activity ---
  const activities = [
    {
      id: "demo_act_1",
      action: "match_created",
      targetType: "match",
      targetId: "demo_match_student",
      metadata: { note: "Curated Sara → Nordbridge" },
    },
    {
      id: "demo_act_2",
      action: "content_published",
      targetType: "content_item",
      targetId: "demo_mock_interview",
      metadata: { title: "Mock interview" },
    },
    {
      id: "demo_act_3",
      action: "company_activated",
      targetType: "company",
      targetId: primaryCompanyUid,
      metadata: { plan: "track_b" },
    },
  ];
  for (const a of activities) {
    await db
      .collection("activity_log")
      .doc(a.id)
      .set(
        stripUndefined({
          actorId: "seed-demo",
          actorRole: "admin",
          action: a.action,
          targetType: a.targetType,
          targetId: a.targetId,
          metadata: a.metadata,
          createdAt: now,
        }),
        { merge: true },
      );
  }
  log.push("activity_log");

  // Enrich homepage stat blocks if empty-looking
  const homeRef = db.collection("page_home").doc("default");
  const homeSnap = await homeRef.get();
  const home = homeSnap.data() ?? {};
  await homeRef.set(
    stripUndefined({
      ...home,
      statBlocks: [
        {
          label: "Active students",
          value: "0",
          metric: "active_students",
          suffix: "+",
        },
        {
          label: "Partner employers",
          value: "0",
          metric: "active_companies",
          suffix: "+",
        },
        {
          label: "Avg. time to place",
          value: "—",
          metric: "avg_time_to_place",
        },
        {
          label: "Placed this year",
          value: "0",
          metric: "placed_this_year",
          suffix: "+",
        },
      ],
      testimonialQuote:
        home.testimonialQuote ||
        "Nextgenmove turned a cold Dubai application into a coached placement in six weeks.",
      testimonialAttribution:
        home.testimonialAttribution || "Sara K. · Marketing Lead",
      testimonialBadge: home.testimonialBadge || "Placed {year}",
      updatedAt: now,
    }),
    { merge: true },
  );

  console.log("\nDemo seed complete.\n");
  for (const line of log) console.log(" -", line);
  console.log(`
Login credentials (password for all: ${DEMO_PASSWORD})
  Admin (from seed):     admin@nextgenmove.ae  /  (SEED_ADMIN_PASSWORD in .env.local)
  Employer:              employer@Nextgenmove.demo
  Student:               student@Nextgenmove.demo
  Talent (e.g.):         sara.kowalski@Nextgenmove.demo
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
