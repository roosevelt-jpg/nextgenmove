/** Cookie + locale helpers shared by client and server. */

export const LOCALE_COOKIE = "venturo_locale";

export const RTL_LOCALES = new Set([
  "ar",
  "he",
  "fa",
  "ur",
  "yi",
  "ps",
  "sd",
  "ug",
  "dv",
  "ku",
  "ckb",
]);

/** ISO 639-1 (+ a few 639-2/3 common) language codes for the world picker. */
const FALLBACK_LANGUAGE_CODES = [
  "aa","ab","ae","af","ak","am","an","ar","as","av","ay","az","ba","be","bg","bh","bi","bm","bn","bo","br","bs","ca","ce","ch","co","cr","cs","cu","cv","cy","da","de","dv","dz","ee","el","en","eo","es","et","eu","fa","ff","fi","fj","fo","fr","fy","ga","gd","gl","gn","gu","gv","ha","he","hi","ho","hr","ht","hu","hy","hz","ia","id","ie","ig","ii","ik","io","is","it","iu","ja","jv","ka","kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky","la","lb","lg","li","ln","lo","lt","lu","lv","mg","mh","mi","mk","ml","mn","mr","ms","mt","my","na","nb","nd","ne","ng","nl","nn","no","nr","nv","ny","oc","oj","om","or","os","pa","pi","pl","ps","pt","qu","rm","rn","ro","ru","rw","sa","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur","uz","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zu",
];

export function isRtlLocale(locale: string): boolean {
  const base = locale.split("-")[0]?.toLowerCase() ?? "en";
  return RTL_LOCALES.has(base);
}

export function normalizeLocale(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "en";
  const trimmed = raw.trim().replace("_", "-");
  if (!trimmed) return "en";
  const base = trimmed.split("-")[0]!.toLowerCase();
  if (!/^[a-z]{2,3}$/.test(base)) return "en";
  return trimmed.length > 8 ? base : trimmed;
}

export function listWorldLanguages(displayLocale = "en"): {
  code: string;
  label: string;
}[] {
  let codes: string[] = FALLBACK_LANGUAGE_CODES;
  try {
    if (
      typeof Intl !== "undefined" &&
      typeof (
        Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
      ).supportedValuesOf === "function"
    ) {
      codes = (
        Intl as unknown as { supportedValuesOf: (k: string) => string[] }
      ).supportedValuesOf("language");
    }
  } catch {
    codes = FALLBACK_LANGUAGE_CODES;
  }

  const dn = new Intl.DisplayNames([displayLocale, "en"], { type: "language" });
  const seen = new Set<string>();
  const items: { code: string; label: string }[] = [];

  for (const code of codes) {
    const base = code.split("-")[0]!.toLowerCase();
    if (seen.has(base)) continue;
    seen.add(base);
    const label = dn.of(base) ?? base;
    items.push({ code: base, label });
  }

  items.sort((a, b) => a.label.localeCompare(b.label, displayLocale));
  return items;
}

export function readLocaleCookie(cookieHeader: string | null): string {
  if (!cookieHeader) return "en";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`),
  );
  return normalizeLocale(
    match?.[1] ? decodeURIComponent(match[1]) : undefined,
  );
}
