import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { normalizeLocale } from "@/lib/i18n/locales";

function cacheDocId(target: string, text: string): string {
  return createHash("sha256")
    .update(`${target}\0${text}`)
    .digest("hex")
    .slice(0, 40);
}

async function translateOne(
  text: string,
  target: string,
): Promise<string> {
  if (!text.trim() || target === "en") {
    return text;
  }

  const id = cacheDocId(target, text);
  const ref = adminDb.collection("locale_translations").doc(id);
  const cached = await ref.get();
  if (cached.exists) {
    const translated = String(cached.data()?.translated ?? "");
    if (translated) return translated;
  }

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 500));
  url.searchParams.set("langpair", `en|${target}`);

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return text;
    }
    const payload = (await response.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = String(
      payload.responseData?.translatedText ?? text,
    ).trim();
    const finalText =
      !translated ||
      translated.toUpperCase().includes("MYMEMORY WARNING")
        ? text
        : translated;

    await ref.set(
      stripUndefined({
        id,
        source: "en",
        target,
        original: text,
        translated: finalText,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    return finalText;
  } catch {
    return text;
  }
}

/** Translate a batch of English strings into `target` locale (cached). */
export async function translateBatch(
  texts: string[],
  targetLocale: string,
): Promise<string[]> {
  const target = normalizeLocale(targetLocale).split("-")[0]!;
  if (target === "en") {
    return texts;
  }

  const unique = [...new Set(texts.filter((t) => typeof t === "string" && t))];
  const map = new Map<string, string>();

  // Sequential with light concurrency to respect free API limits
  const concurrency = 4;
  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (text) => {
        const translated = await translateOne(text, target);
        return [text, translated] as const;
      }),
    );
    for (const [src, dst] of results) {
      map.set(src, dst);
    }
  }

  return texts.map((t) => map.get(t) ?? t);
}
