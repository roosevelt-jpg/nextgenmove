/**
 * Merge testimonials section chrome into page_home/default (no demo testimonials).
 * Usage: npx tsx scripts/patch-page-home-testimonials.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase-admin";
import { stripUndefined } from "../src/lib/stripUndefined";

const TESTIMONIALS_SHELL = {
  testimonialsEyebrow: "Testimonials",
  testimonialsHeadline: "Voices from the route.",
  testimonialsSubtext:
    "Students and employers share what the move felt like — published after review.",
  testimonialsManagedLabel: "Managed in admin · Homepage content",
  testimonialsSubmitCta: "Submit testimonial",
  testimonialsSignInPrompt:
    "Sign in as a student or employer to share your experience.",
  testimonialsSignInCta: "Sign in to post",
  testimonialsEmptyText:
    "Be the first voice on this board — sign in and submit a testimonial for review.",
  testimonialsPendingThanks: "Thanks — your testimonial is pending review.",
  testimonialsQuoteLabel: "Your testimonial",
  testimonialsRatingLabel: "Rating",
  testimonialsPhotoLabel: "Photo (optional)",
  testimonialsNameLabel: "Your name",
  testimonialsSlider: {
    enabled: true,
    speedSec: 48,
    pauseOnHover: true,
    direction: "ltr",
  },
};

async function main() {
  const ref = adminDb.collection("page_home").doc("default");
  const snap = await ref.get();
  const existing = snap.data() ?? {};
  await ref.set(
    stripUndefined({
      ...TESTIMONIALS_SHELL,
      // Prefer existing CMS values when already set.
      testimonialsEyebrow:
        existing.testimonialsEyebrow || TESTIMONIALS_SHELL.testimonialsEyebrow,
      testimonialsHeadline:
        existing.testimonialsHeadline || TESTIMONIALS_SHELL.testimonialsHeadline,
      testimonialsSubtext:
        existing.testimonialsSubtext || TESTIMONIALS_SHELL.testimonialsSubtext,
      testimonialsManagedLabel:
        existing.testimonialsManagedLabel ||
        TESTIMONIALS_SHELL.testimonialsManagedLabel,
      testimonialsSubmitCta:
        existing.testimonialsSubmitCta || TESTIMONIALS_SHELL.testimonialsSubmitCta,
      testimonialsSignInPrompt:
        existing.testimonialsSignInPrompt ||
        TESTIMONIALS_SHELL.testimonialsSignInPrompt,
      testimonialsSignInCta:
        existing.testimonialsSignInCta || TESTIMONIALS_SHELL.testimonialsSignInCta,
      testimonialsEmptyText:
        existing.testimonialsEmptyText || TESTIMONIALS_SHELL.testimonialsEmptyText,
      testimonialsPendingThanks:
        existing.testimonialsPendingThanks ||
        TESTIMONIALS_SHELL.testimonialsPendingThanks,
      testimonialsQuoteLabel:
        existing.testimonialsQuoteLabel ||
        TESTIMONIALS_SHELL.testimonialsQuoteLabel,
      testimonialsRatingLabel:
        existing.testimonialsRatingLabel ||
        TESTIMONIALS_SHELL.testimonialsRatingLabel,
      testimonialsPhotoLabel:
        existing.testimonialsPhotoLabel ||
        TESTIMONIALS_SHELL.testimonialsPhotoLabel,
      testimonialsNameLabel:
        existing.testimonialsNameLabel ||
        TESTIMONIALS_SHELL.testimonialsNameLabel,
      testimonialsSlider: {
        ...TESTIMONIALS_SHELL.testimonialsSlider,
        ...(existing.testimonialsSlider as object | undefined),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("page_home/default testimonials section shell merged");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
