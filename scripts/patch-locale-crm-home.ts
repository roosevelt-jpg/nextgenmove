/**
 * Patch locale labels, nationality taxonomy, auth/CRM labels, Twilio integration,
 * and Nextgenmove homepage CMS copy.
 *
 * Run: npx tsx scripts/patch-locale-crm-home.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

const NATIONALITIES = [
  ["ae", "Emirati"],
  ["sa", "Saudi"],
  ["in", "Indian"],
  ["pk", "Pakistani"],
  ["bd", "Bangladeshi"],
  ["ph", "Filipino"],
  ["eg", "Egyptian"],
  ["jo", "Jordanian"],
  ["lb", "Lebanese"],
  ["sy", "Syrian"],
  ["iq", "Iraqi"],
  ["ir", "Iranian"],
  ["tr", "Turkish"],
  ["gb", "British"],
  ["ie", "Irish"],
  ["us", "American"],
  ["ca", "Canadian"],
  ["au", "Australian"],
  ["nz", "New Zealander"],
  ["za", "South African"],
  ["ng", "Nigerian"],
  ["ke", "Kenyan"],
  ["gh", "Ghanaian"],
  ["fr", "French"],
  ["de", "German"],
  ["nl", "Dutch"],
  ["be", "Belgian"],
  ["es", "Spanish"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["pl", "Polish"],
  ["ro", "Romanian"],
  ["ua", "Ukrainian"],
  ["ru", "Russian"],
  ["cn", "Chinese"],
  ["hk", "Hong Konger"],
  ["tw", "Taiwanese"],
  ["jp", "Japanese"],
  ["kr", "Korean"],
  ["sg", "Singaporean"],
  ["my", "Malaysian"],
  ["id", "Indonesian"],
  ["th", "Thai"],
  ["vn", "Vietnamese"],
  ["br", "Brazilian"],
  ["mx", "Mexican"],
  ["ar", "Argentine"],
  ["co", "Colombian"],
  ["other", "Other"],
].map(([value, label]) => ({ value, label }));

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();

  const settingsRef = db.collection("site_settings").doc("default");
  const settingsSnap = await settingsRef.get();
  const existing = settingsSnap.data() || {};
  const authLabels = {
    ...((existing.authLabels as Record<string, string>) || {}),
    phoneLabel: "Phone",
    nationalityLabel: "Nationality",
    workExperienceLabel: "Work experience",
    educationLabel: "Universities / education attended",
    institutionLabel: "Institution",
    degreeLabel: "Degree",
    yearLabel: "Year",
    addEducationLabel: "Add education",
  };
  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, Record<string, string>>) ||
      {}),
  };
  adminPageLabels.crm = {
    ...(adminPageLabels.crm || {}),
    phone: "Phone",
    nationality: "Nationality",
    dateJoined: "Date joined",
    workExperience: "Work experience",
    education: "Education",
    messageTitle: "Message",
    messageSubject: "Subject",
    messageBody: "Message",
    sendMessage: "Send",
    messageSent: "Message sent.",
    messageError: "Could not send message.",
    channel_email: "Email",
    channel_sms: "SMS",
    channel_whatsapp: "WhatsApp",
  };
  adminPageLabels.integrations = {
    ...(adminPageLabels.integrations || {}),
    twilioAccountSid: "Account SID",
    twilioAuthToken: "Auth token",
    twilioFromSms: "SMS from number",
    twilioFromWhatsApp: "WhatsApp from number",
    twilioHelp:
      "Connect Twilio for SMS and WhatsApp. Use E.164 numbers; WhatsApp sender must be enabled in Twilio.",
  };

  await settingsRef.set(
    stripUndefined({
      siteName: "Nextgenmove",
      brandMark: "N",
      tagline: existing.tagline || "Your next step, engineered.",
      localeLabels: {
        ...((existing.localeLabels as Record<string, string>) || {}),
        languageAriaLabel: "Language",
        searchPlaceholder: "Search languages",
      },
      authLabels,
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const taxRef = db.collection("taxonomies").doc("default");
  const taxSnap = await taxRef.get();
  const taxData = taxSnap.data() || {};
  await taxRef.set(
    stripUndefined({
      ...taxData,
      nationality: NATIONALITIES,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const homeRef = db.collection("page_home").doc("default");
  await homeRef.set(
    stripUndefined({
      eyebrowText: "Relocation. Engineered.",
      headline: "Your next step,",
      headlineEmphasis: "engineered.",
      subtext:
        "Nextgenmove pairs you with a personal coach, a vetted employer, and a visa-ready path abroad — from first application to first day.",
      ctaPrimaryLabel: "Explore open roles",
      ctaPrimaryHref: "/careers-talent",
      ctaSecondaryLabel: "I'm hiring",
      ctaSecondaryHref: "/request-talent",
      hubLabel: "DXB",
      currentRoutesLabel: "Current routes",
      globalReachEyebrow: "Global reach",
      globalReachHeadline: "Six corridors. One arrival city.",
      globalReachBody:
        "Every route on this map is live — a coach on one end, a vetted employer on the other, and a candidate somewhere mid-flight.",
      corridorChips: [
        { chip: "AMS → DXB" },
        { chip: "BER → DXB" },
        { chip: "CAI → DXB" },
        { chip: "WAW → DXB" },
        { chip: "PAR → DXB" },
        { chip: "LIS → DXB" },
      ],
      originCities: [
        {
          code: "AMS",
          label: "Amsterdam",
          initials: "AM",
          x: 80,
          y: 140,
          avatarX: 80,
          avatarY: 105,
        },
        {
          code: "BER",
          label: "Berlin",
          initials: "BE",
          x: 70,
          y: 250,
          avatarX: 55,
          avatarY: 250,
        },
        {
          code: "CAI",
          label: "Cairo",
          initials: "CA",
          x: 90,
          y: 360,
          avatarX: 78,
          avatarY: 398,
        },
        {
          code: "WAW",
          label: "Warsaw",
          initials: "WA",
          x: 420,
          y: 120,
          avatarX: 430,
          avatarY: 85,
        },
        {
          code: "PAR",
          label: "Paris",
          initials: "PA",
          x: 440,
          y: 260,
          avatarX: 465,
          avatarY: 260,
        },
        {
          code: "LIS",
          label: "Lisbon",
          initials: "LI",
          x: 410,
          y: 380,
          avatarX: 425,
          avatarY: 405,
        },
      ],
      itineraryEyebrow: "The itinerary",
      itineraryHeadline: "Three legs. One arrival.",
      talentCta: {
        eyebrow: "For talent",
        title: "Your seat is waiting.",
        body: "Free to join. Earn your first credits on welcome.",
        ctaLabel: "Get started",
        ctaHref: "/sign-up",
      },
      companyCta: {
        eyebrow: "For companies",
        title: "A pool, pre-flown.",
        body: "Every candidate is pre-screened and coached before you see them.",
        ctaLabel: "View plans",
        ctaHref: "/pricing",
      },
      testimonialBadge: "Placed {year}",
      testimonialAttribution:
        "Sara K., Marketing Lead — placed via Nextgenmove",
      boardingPass: {
        routeLabel: "AMS → DXB",
        passengerLabel: "Passenger",
        passengerValue: "You",
        coachLabel: "Coach",
        coachValue: "Assigned coach",
        statusLabel: "Status",
        statusValue: "Boarding",
        classLabel: "Class",
        classValue: "Track B",
        refLabel: "Ref",
        refValue: "NEXTGENMOVE",
      },
      steps: [
        {
          legNumber: 1,
          phaseLabel: "LEG 01 · Check-in",
          title: "Build your profile",
          description:
            "Tell us your skills, sector, and where you want to land. Your coach verifies and sharpens it.",
        },
        {
          legNumber: 2,
          phaseLabel: "LEG 02 · Boarding",
          title: "Get matched & coached",
          description:
            "We introduce you to vetted employers, and coach you through every interview and offer.",
        },
        {
          legNumber: 3,
          phaseLabel: "LEG 03 · Arrival",
          title: "Placed & supported",
          description:
            "From signed offer to your first ninety days, your coach stays on the route with you.",
        },
      ],
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
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const twilioRef = db.collection("integrations").doc("twilio");
  const twilioSnap = await twilioRef.get();
  if (twilioSnap.exists) {
    await twilioRef.set(
      stripUndefined({
        name: "Twilio",
        category: "SMS",
        description: "SMS and WhatsApp messaging for CRM outreach.",
        config: {
          ...((twilioSnap.data()?.config as Record<string, string>) || {}),
          category: "SMS",
        },
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  } else {
    await twilioRef.set(
      stripUndefined({
        id: "twilio",
        name: "Twilio",
        category: "SMS",
        description: "SMS and WhatsApp messaging for CRM outreach.",
        iconUrl: "",
        status: "not_connected",
        config: { category: "SMS" },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  }

  console.log("Patched locale, nationality, CRM messaging labels, and Nextgenmove home.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
