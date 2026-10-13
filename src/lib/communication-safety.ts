// Enseña's Communication Safety & Off-Platform Prevention engine — the ONE
// place that decides whether a piece of user-generated text (a message, a
// review, a profile bio, ...) may reach another user. Every surface that
// accepts free text from a student or tutor should call analyzeCommunication()
// before persisting/delivering it, rather than re-implementing detection
// locally — see messages-store.ts, reviews-store.ts, and my-profile-client.tsx
// for the current call sites.
//
// IMPORTANT ARCHITECTURAL NOTE: this app has no real backend — no server, no
// API routes, no database (see every other *-store.ts this session). There is
// therefore no way to build genuinely unbypassable "server-side" enforcement;
// what this module gives you is the client-side equivalent — a single choke
// point that every UI send-path in THIS app is wired through, so a message
// can't be pushed to another user by any button in the app without passing
// through here first. A user editing localStorage directly could still bypass
// it, exactly as they could bypass any other client-only rule in this demo —
// that gap only closes with a real backend, which is out of scope here.
import { findPhoneNumbersInText } from "libphonenumber-js";

export type SafetyCategory = "url" | "email" | "phone" | "social" | "payment" | "address";
export type SafetyConfidence = "high" | "medium";

export interface SafetyFinding {
  category: SafetyCategory;
  confidence: SafetyConfidence;
}

export type SafetyVerdict = "allow" | "block";

export interface SafetyAnalysis {
  verdict: SafetyVerdict;
  findings: SafetyFinding[];
  // The single finding driving the verdict (highest confidence, first found)
  // — used to decide whether this is a "confirmed violation" (high) or a
  // "flagged for review" case (medium). Never shown to the offending user.
  primary?: SafetyFinding;
}

// Enseña's own domains — links to these are never flagged. Everything else
// is treated as an external link per "external links are not allowed in
// student-teacher communication."
const ALLOWED_DOMAINS = ["ensena.co", "ensena.app", "localhost"];

// "signal" and "line" are deliberately NOT in this list — they're also
// ordinary English words ("the big signal", "wait in line"), and a bare
// keyword match here is enough on its own to block a message. They're
// still caught via the more specific compound phrases in CONTACT_VERBS
// below ("on signal", "signal app", ...), which don't collide with normal
// sentences the same way.
const PLATFORM_KEYWORDS = [
  "whatsapp", "telegram", "instagram", "facebook", "tiktok", "snapchat",
  "twitter", "x.com", "linkedin", "discord", "skype", "wechat",
  "viber", "messenger", "google meet", "zoom", "microsoft teams",
  "facetime", "calendly",
];

// Short aliases ("IG", "WA", "FB") are too short to substring-match safely
// (they'd hit "big", "wait", "before"...) — these are checked separately
// with real word boundaries against the normalized text, never as a
// substring of the space-collapsed variant.
const PLATFORM_SHORT_ALIASES = "\\b(ig|insta|wa|fb)\\b";

const CONTACT_VERBS = [
  "dm me", "message me", "text me", "call me", "contact me", "reach me",
  "add me", "find me", "connect with me", "whatsapp me", "email me directly",
  "personal email", "personal number", "my number is", "my email is",
];

// Full compound phrases for platforms whose bare name is too ordinary a
// word to safely keyword-match on its own (see the PLATFORM_KEYWORDS
// comment above) — these are specific enough as complete strings that they
// don't collide with normal sentences the way a bare "signal"/"line" would.
const AMBIGUOUS_PLATFORM_PHRASES = ["on signal", "via signal", "signal app", "on line app", "add me on line"];

// Explicit off-platform SOLICITATION — the sender isn't leaking their own
// contact info yet, but is clearly asking for or announcing intent to
// exchange it. Real signal, but with nothing concrete blocked yet, so this
// stays medium confidence (flagged for review) rather than an auto-strike.
const SOLICITATION_PHRASES = [
  "give me your number", "can i have your number", "give me your whatsapp",
  "what's your instagram", "whats your instagram", "send me a dm",
  "i'll send you my number", "ill send you my number", "i'll send you my email",
  "ill send you my email", "i'll send you my contact", "ill send you my contact",
  "let's continue this on", "lets continue this on", "let's use zoom instead",
  "lets use zoom instead",
];

// Solicitation specifically about meeting/location, not generic contact
// exchange — kept separate so these can be labeled "address" rather than
// "social" for admins reviewing a case.
const ADDRESS_SOLICITATION_PHRASES = [
  "let's meet in person", "lets meet in person", "here's my location",
  "heres my location", "i'll send you my location", "ill send you my location",
  "come to my house", "meet me at my", "what's your address", "whats your address",
  "send me your address", "drop your location",
];

// Wording that suggests a digit sequence is an academic reference, not
// contact info — "Question 5 has the answer 08019185049" vs. "call me on
// 08019185049". Used to downgrade an otherwise-high-confidence phone-shaped
// match to a flagged (not auto-confirmed) finding, per "pattern + context +
// intent, not pattern alone."
const ACADEMIC_CONTEXT_MARKERS = [
  "question", "answer", "page", "chapter", "exercise", "problem",
  "formula", "equation", "result", "score", "grade", "figure", "table",
];

const PAYMENT_KEYWORDS = [
  "bank transfer", "account number", "acc no", "acct no", "sort code",
  "routing number", "paypal", "cash app", "cashapp", "venmo",
  "crypto wallet", "bitcoin address", "btc address", "wallet address",
  "send the money directly", "pay me directly", "pay directly",
  "outside the platform", "outside enseña", "outside ensena",
  "pay me on", "send payment to", "don't pay through", "dont pay through",
  "i don't want to pay through", "i dont want to pay through",
];

// Normalizes common obfuscation tricks into a canonical form before pattern
// matching — spaced-out "dot"/"at" words, bracketed separators, zero-width
// characters, and collapsed whitespace. This is Layer 2 of the pipeline
// (Layer 1 is the raw-text pass that still runs separately below it).
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width characters
    .replace(/\s*\(\s*dot\s*\)\s*|\s*\[\s*dot\s*\]\s*|\s+dot\s+|\s+period\s+|\s+full stop\s+/g, ".")
    .replace(/\s*\(\s*at\s*\)\s*|\s*\[\s*at\s*\]\s*|\s+at\s+|\s+at sign\s+/g, "@")
    .replace(/\bhxxps?\b/g, (m) => (m.endsWith("s") ? "https" : "http"))
    .replace(/\s*:\s*\/\/\s*/g, "://")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Homoglyph/leetspeak digit substitution (O->0, I/l->1, S->5, B->8) — but
// ONLY applied to a token that's already almost entirely digits-and-these-
// letters and at least phone-length, never to prose. "SOLVE" or "BIBLE"
// never match this (real words have plenty of other letters); "O8OI234S67B"
// does. This precision is what lets it run unconditionally without
// clobbering ordinary text the way a global S->5 replace would.
const LEET_DIGIT_TOKEN = /^[0-9oislb]{7,}$/i;
const LEET_DIGIT_MAP: Record<string, string> = { o: "0", i: "1", l: "1", s: "5", b: "8" };
function deleetifyPhoneLikeTokens(text: string): string {
  return text.replace(/\S+/g, (token) =>
    LEET_DIGIT_TOKEN.test(token) ? token.replace(/[oislb]/gi, (ch) => LEET_DIGIT_MAP[ch.toLowerCase()]) : token
  );
}

// Phrases that don't themselves contain contact information but clearly
// instruct the recipient how to reconstruct/decode it from other messages —
// "remove the spaces", "read this backwards", "use the first letter of
// each line". Real signal on their own (worth a flagged review), and a
// strong ESCALATOR when they co-occur with any other finding in the same
// or recent messages (see analyzeCommunication's use of this below).
const RECONSTRUCTION_INSTRUCTION_PHRASES = [
  "remove the spaces", "join these together", "put them together", "join them together",
  "read this backwards", "read it backwards", "read backwards", "in reverse order",
  "read them continuously", "combine these", "combine them",
  "use the first letter", "take the first letter", "first letters of each",
  "every other letter", "every second letter", "every third letter", "every nth letter",
  "search my name on", "google my name", "i'm the only person with this username",
  "im the only person with this username", "save this number", "add this to your contacts",
  "on your keypad", "press these numbers",
];

// --- Number-word reconstruction ------------------------------------------
// "zero eight zero one nine one eight five zero four nine" is a phone
// number nobody's regex will ever match as digits -- this walks the text
// token by token, converts recognized digit-words to actual digits, and
// tolerates a couple of filler words/punctuation between them (matching
// "zero eight zero -- my number -- one nine one..."). It's deliberately
// conservative: a run has to reach DIGIT_RUN_MIN consecutive digit-tokens
// (fillers don't count against the run) before it's treated as a
// candidate number, so "Chapter 8, page 49" or "in the 1990s" -- which
// never produce a long unbroken run of digit-words -- don't trigger it.
// A small set of common misspellings/phonetic near-homophones on top of the
// canonical digit words — deliberately not exhaustive (see the "don't
// publish the full bypass list" note further down); "free" for "three" is
// included because it's a genuinely common Nigerian-English rendering, not
// just a hypothetical typo. Each only ever matters inside a long digit-run
// (DIGIT_RUN_MIN below), so an ordinary sentence using one of these words
// once in passing never comes close to tripping this.
const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", nought: "0", naught: "0", sero: "0",
  one: "1", won: "1",
  two: "2",
  three: "3", free: "3",
  four: "4", fo: "4",
  five: "5",
  six: "6",
  seven: "7", sevn: "7",
  eight: "8", ate: "8",
  nine: "9",
};
const MULTIPLIER_WORDS: Record<string, number> = { double: 2, triple: 3 };
const DIGIT_RUN_MIN = 6;
const MAX_FILLER_GAP = 2;

function reconstructNumberWordRuns(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[\s,.;:!?()[\]—–-]+/)
    .filter(Boolean);

  const candidates: string[] = [];
  let run = "";
  let digitCount = 0;
  let fillerStreak = 0;

  function flush() {
    if (digitCount >= DIGIT_RUN_MIN) candidates.push(run);
    run = "";
    digitCount = 0;
    fillerStreak = 0;
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token in MULTIPLIER_WORDS && tokens[i + 1] in DIGIT_WORDS) {
      const count = MULTIPLIER_WORDS[token];
      const digit = DIGIT_WORDS[tokens[i + 1]];
      run += digit.repeat(count);
      digitCount += count;
      fillerStreak = 0;
      i++; // consume the digit word too
      continue;
    }
    if (token in DIGIT_WORDS) {
      run += DIGIT_WORDS[token];
      digitCount++;
      fillerStreak = 0;
      continue;
    }
    if (/^\d+$/.test(token)) {
      // Bare digits mixed into a spoken sequence ("080 one nine one...").
      run += token;
      digitCount += token.length;
      fillerStreak = 0;
      continue;
    }
    // Non-digit filler (e.g. "call", "me", "then", "-") -- tolerate a short
    // gap so the run survives filler words, but end the run once too many
    // consecutive non-digit tokens appear (an ordinary sentence resumes).
    fillerStreak++;
    if (fillerStreak > MAX_FILLER_GAP) flush();
  }
  flush();
  return candidates;
}

// Converts every recognized digit-word to its digit, one token at a time,
// with NO minimum run length — unlike reconstructNumberWordRuns, this isn't
// gated on run length because the caller only tests the result against
// ADDRESS_PATTERN, which itself requires a real street-type word nearby.
// That proximity requirement is what keeps this safe from false positives,
// the same "anchor to something specific" principle EMAIL_DOMAIN_DASH_PATTERN
// already relies on — so "one four Main Street" reconstructs to "14 Main
// Street" without needing six-plus consecutive number words first.
function reconstructWordNumbersLoosely(text: string): string {
  return text
    .toLowerCase()
    .split(/([\s,.;:!?()[\]—–-]+)/)
    .map((token) => DIGIT_WORDS[token] ?? token)
    .join("");
}

// A whitespace-stripped variant catches "w h a t s a p p" / "wh ats app"
// style spacing tricks for keyword matching only (not used for URL/email/
// phone patterns, which rely on real delimiters).
function collapseSpaces(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

// Regex literals below are read-only patterns handed to a fresh `RegExp`
// instance on every call (see `matches`/`tests` helpers) — reusing a single
// `g`-flagged RegExp object across calls would leak `lastIndex` state
// between unrelated strings and silently miss matches.
const URL_PATTERN = "\\b((https?:\\/\\/)|(www\\.))[^\\s]+|\\b[a-z0-9-]+\\.(com|net|org|io|co|ng|me|app|xyz|info|biz|link|ly|gg|tv|us|uk|ca|au|de|fr|in|edu|gov)\\b(\\/[^\\s]*)?";
const EMAIL_PATTERN = "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}";
const HANDLE_PATTERN = "(?<![a-z0-9])@[a-z0-9_.]{3,30}\\b";
const BARE_PHONE_PATTERN = "\\b0\\d{9,10}\\b";
const IBAN_PATTERN = "\\b[a-z]{2}\\d{2}[a-z0-9]{10,30}\\b";
// "cynthiaaj — gmail — com" — dashes standing in for both "at" and "dot"
// with no separator words at all. Anchored to a real mail-provider name so
// it doesn't fire on every dash-separated phrase.
const EMAIL_DOMAIN_DASH_PATTERN = "[a-z0-9._-]{2,}\\s*[—–-]\\s*(gmail|yahoo|outlook|hotmail|icloud|protonmail)\\s*[—–-]\\s*(com|co)\\b";

// A house/plot number sitting within a few words of a real street-type
// word — "14 Main Street", "Plot 22, Admiralty Way" — common Nigerian
// addressing conventions included alongside the generic ones.
const STREET_TYPE_WORDS = "(street|st|road|rd|avenue|ave|close|crescent|lane|drive|way|estate|boulevard|highway|expressway|plot)";
const ADDRESS_PATTERN = `\\b\\d{1,5}\\b[^.!?\\n]{0,25}\\b${STREET_TYPE_WORDS}\\b|\\b${STREET_TYPE_WORDS}\\b[^.!?\\n]{0,25}\\b\\d{1,5}\\b`;

function matches(text: string, pattern: string): string[] {
  return text.match(new RegExp(pattern, "gi")) ?? [];
}

function tests(text: string, pattern: string): boolean {
  return new RegExp(pattern, "i").test(text);
}

function extractDomain(match: string): string | null {
  const cleaned = match.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const domain = cleaned.split(/[/?#]/)[0].toLowerCase();
  return domain || null;
}

function isAllowedDomain(domain: string): boolean {
  return ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function analyzeCommunication(rawText: string): SafetyAnalysis {
  const text = rawText ?? "";
  const normalized = normalize(text);
  const noSpace = collapseSpaces(text);
  const findings: SafetyFinding[] = [];

  // --- URLs (external only — internal Enseña links are allowed) ---
  for (const source of [text, normalized]) {
    for (const m of matches(source, URL_PATTERN)) {
      const domain = extractDomain(m);
      if (domain && !isAllowedDomain(domain)) {
        findings.push({ category: "url", confidence: "high" });
        break;
      }
    }
    if (findings.some((f) => f.category === "url")) break;
  }

  // --- Emails ---
  if (tests(text, EMAIL_PATTERN) || tests(normalized, EMAIL_PATTERN)) {
    findings.push({ category: "email", confidence: "high" });
  } else if (tests(normalized, EMAIL_DOMAIN_DASH_PATTERN)) {
    // "cynthiaaj — gmail — com" — no explicit "at"/"dot" words at all, just
    // dashes standing in for both separators. Narrower net than the
    // dot/at-word normalization above (only fires next to a known mail
    // provider name), so it stays high-precision rather than matching any
    // dash-separated sentence.
    findings.push({ category: "email", confidence: "high" });
  }

  // --- Phone numbers — a real international parser, not a toy regex, PLUS
  // reconstruction of numbers spelled out in words ("zero eight zero
  // one..."), which no digit-oriented pattern below would ever catch.
  const phoneMatches = findPhoneNumbersInText(text, "NG");
  const wordPhoneCandidates = reconstructNumberWordRuns(text);
  const deleeted = deleetifyPhoneLikeTokens(text);
  const phoneLikeFound =
    phoneMatches.some((m) => m.number.isValid()) ||
    tests(text, BARE_PHONE_PATTERN) ||
    wordPhoneCandidates.some((c) => findPhoneNumbersInText(c, "NG").some((m) => m.number.isValid()) || tests(c, BARE_PHONE_PATTERN)) ||
    (deleeted !== text && (findPhoneNumbersInText(deleeted, "NG").some((m) => m.number.isValid()) || tests(deleeted, BARE_PHONE_PATTERN)));
  if (phoneLikeFound) {
    // A digit sequence that happens to look like a phone number isn't
    // automatically someone sharing their number — "Question 5 has the
    // answer 08019185049" is academic content, not "call me on
    // 08019185049". When there's a clear academic-reference marker nearby
    // AND no actual contact intent in the same message, this isn't treated
    // as a finding at all (pattern + context + intent, not pattern alone).
    const hasAcademicMarker = ACADEMIC_CONTEXT_MARKERS.some((m) => normalized.includes(m));
    const hasContactIntent = CONTACT_VERBS.some((v) => normalized.includes(v)) || SOLICITATION_PHRASES.some((p) => normalized.includes(p));
    if (!(hasAcademicMarker && !hasContactIntent)) {
      findings.push({ category: "phone", confidence: "high" });
    }
  }

  // --- Social handles / platforms ---
  const hasHandle = tests(text, HANDLE_PATTERN);
  const mentionsPlatform = PLATFORM_KEYWORDS.some((k) => noSpace.includes(k.replace(/\s+/g, ""))) || tests(normalized, PLATFORM_SHORT_ALIASES);
  const hasContactVerb = CONTACT_VERBS.some((v) => normalized.includes(v)) || (mentionsPlatform && /\bme\b/.test(normalized));
  const hasSolicitation = SOLICITATION_PHRASES.some((p) => normalized.includes(p));
  const hasAmbiguousPlatformPhrase = AMBIGUOUS_PLATFORM_PHRASES.some((p) => normalized.includes(p));
  if (hasAmbiguousPlatformPhrase || (mentionsPlatform && hasContactVerb) || (hasHandle && (mentionsPlatform || hasContactVerb))) {
    findings.push({ category: "social", confidence: "high" });
  } else if (mentionsPlatform || hasHandle || hasSolicitation) {
    findings.push({ category: "social", confidence: "medium" });
  }

  // --- Payment ---
  const paymentKeywordHit = PAYMENT_KEYWORDS.some((k) => normalized.includes(k));
  const hasIban = tests(text, IBAN_PATTERN);
  const hasLongAccountNumber = /\b\d{10,12}\b/.test(text) && /account|acct|acc\b/.test(normalized);
  if (hasIban || (paymentKeywordHit && hasLongAccountNumber)) {
    findings.push({ category: "payment", confidence: "high" });
  } else if (paymentKeywordHit) {
    findings.push({ category: "payment", confidence: "medium" });
  }

  // --- Physical / meeting address ---
  // A house number sitting right next to a real street-type word is
  // specific enough to auto-confirm on its own ("14 Main Street"); the
  // word-number reconstruction ("one four Main Street") is checked the same
  // way. Bare meeting/location solicitation with no concrete address yet
  // ("come to my house") is real signal but stays medium — flagged for
  // review rather than an immediate strike, same reasoning as the
  // contact-solicitation phrases above.
  const hasAddressPattern = tests(text, ADDRESS_PATTERN) || tests(reconstructWordNumbersLoosely(text), ADDRESS_PATTERN);
  const hasAddressSolicitation = ADDRESS_SOLICITATION_PHRASES.some((p) => normalized.includes(p));
  if (hasAddressPattern) {
    findings.push({ category: "address", confidence: "high" });
  } else if (hasAddressSolicitation) {
    findings.push({ category: "address", confidence: "medium" });
  }

  // --- Reconstruction-instruction escalation ---
  // "Remove the spaces" / "read this backwards" / "use the first letter"
  // don't themselves contain a phone number or email, but they're a strong
  // tell that whatever else is in this message (or was in the recent
  // conversation) is meant to be decoded into one. On their own they're
  // flagged for review (medium); alongside ANY other finding in this same
  // message, they escalate it — this is what a single generic "found a
  // number" check would never catch on its own.
  const hasReconstructionInstruction = RECONSTRUCTION_INSTRUCTION_PHRASES.some((p) => normalized.includes(p));
  if (hasReconstructionInstruction) {
    if (findings.length > 0) {
      for (const f of findings) f.confidence = "high";
    } else {
      findings.push({ category: "social", confidence: "medium" });
    }
  }

  if (findings.length === 0) return { verdict: "allow", findings: [] };

  const primary = findings.find((f) => f.confidence === "high") ?? findings[0];
  // Both confidence tiers block delivery (the platform is protected either
  // way) — the difference is what happens next: a "high" finding is an
  // auto-confirmed violation with an immediate strike, a "medium" finding
  // is blocked but only flagged for admin review (see moderation-store.ts).
  return { verdict: "block", findings, primary };
}

// The message shown to the SENDER — deliberately generic per "do not expose
// the detection logic" (never says which pattern matched).
export const BLOCKED_MESSAGE_COPY =
  "Enseña keeps communication and payments on the platform to protect students and teachers. Sharing personal contact information, external links, or payment details isn't allowed here.";
