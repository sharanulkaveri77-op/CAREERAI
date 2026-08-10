/**
 * ATS Compatibility Service
 * -------------------------
 * Simulates how an Applicant Tracking System "sees" a resume. Design principle:
 * FORMATTING/STRUCTURE checks are 100% rule-based (deterministic, testable, and
 * immune to LLM hallucination on objective facts), while only the KEYWORD
 * EXTRACTION step uses Groq (llama-3.1-8b-instant, cheap + fast).
 *
 * Weight scheme (total 100):
 *   - Standard sections present      20  (Experience 7, Education 5, Skills 8)
 *   - Contact information present    15  (email 6, phone 5, LinkedIn/GitHub 4)
 *   - No ATS-hostile tables/columns  12
 *   - Length sanity check             3  (resumes under ~150 words get flagged)
 *   - Keyword match vs job posting   50  (scaled by match rate)
 * When no job description is supplied, the target keywords list is empty and the
 * score is normalized against the available weight (earned / available * 100),
 * so a structural-only check still yields an honest 0–100 number.
 */

export interface AtsCheck {
  /** Stable identifier so the UI can render icons per check type */
  key: string;
  label: string;
  passed: boolean;
  /** Raw weight this check contributes when passed */
  weight: number;
  /** Human-readable explanation of what was found / what to fix */
  detail: string;
}

export interface AtsReport {
  score: number;
  /** 0–1 fraction of target keywords found, or null when no JD was provided */
  keywordMatchRate: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  checks: AtsCheck[];
  resumeWordCount: number;
  /** True when the run included a job description comparison */
  comparedAgainstJd: boolean;
}

/* ----------------------------- Section headers ---------------------------- */

const SECTION_LABELS = {
  experience: 'Experience section present',
  education: 'Education section present',
  skills: 'Skills section present',
} as const;

// ATS systems locate sections by parsing headers; a resume WITHOUT these clear
// headers scatters its content and drops in ranking. Order matters for the
// multi-word alternations — keep the more specific phrases first.
const SECTION_PATTERNS: Record<keyof typeof SECTION_LABELS, RegExp> = {
  experience: /\b(?:work\s+experience|professional\s+experience|employment\s+history|work\s+history)\b|\bexperience\b/i,
  education: /\b(?:education|academic\s+background)\b/i,
  skills: /\b(?:technical\s+skills|core\s+competencies|technologies|skills)\b/i,
};

// Mirrors weights in the header comment — declared here so the score stays
// self-contained and unit-testable.
const SECTION_WEIGHTS = { experience: 7, education: 5, skills: 8 } as const;

export const checkStandardSections = (resumeText: string): AtsCheck[] => {
  return (Object.keys(SECTION_LABELS) as Array<keyof typeof SECTION_LABELS>).map((key) => {
    const found = SECTION_PATTERNS[key].test(resumeText);
    return {
      key: `section-${key}`,
      label: SECTION_LABELS[key],
      passed: found,
      weight: SECTION_WEIGHTS[key],
      detail: found
        ? 'Header detected in the correct location pattern.'
        : 'Add a dedicated section header so the parser can index this content.',
    };
  });
};

/* ------------------------------ Contact info ------------------------------ */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
// US/international-ish phone: optional country code + 3+3+4 grouping
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{3})[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
const SOCIAL_RE = /(?:linkedin\.com|github\.com)\//i;

export const checkContactInformation = (resumeText: string): AtsCheck[] => {
  const hasEmail = EMAIL_RE.test(resumeText);
  const hasPhone = PHONE_RE.test(resumeText);
  const hasSocial = SOCIAL_RE.test(resumeText);

  return [
    {
      key: 'contact-email',
      label: 'Email address present',
      passed: hasEmail,
      weight: 6,
      detail: hasEmail
        ? 'Email parsed successfully.'
        : 'No valid email found — recruiters cannot reply without one.',
    },
    {
      key: 'contact-phone',
      label: 'Phone number present',
      passed: hasPhone,
      weight: 5,
      detail: hasPhone
        ? 'Phone number detected.'
        : 'Phone number missing or in an unparseable format.',
    },
    {
      key: 'contact-social',
      label: 'LinkedIn or GitHub profile present',
      passed: hasSocial,
      weight: 4,
      detail: hasSocial
        ? 'Social/professional profile URL found.'
        : 'Add a LinkedIn (or GitHub) URL — most trackers validate these.',
    },
  ];
};

/* --------------------------- Tables / columns ----------------------------- */
// Heuristics that flag layout artifacts commonly produced when a resume uses
// tables or multi-column layouts: tab-separated rows, vertical-bar separators,
// and heavy internal column alignment (3+ consecutive spaces mid-line).

const TAB_COLUMNS_MIN_LINES = 3;
const PIPE_COLUMNS_MIN_LINES = 3;
const ALIGNED_SPACE_RATIO = 0.2;

export const checkTableLayout = (resumeText: string): AtsCheck => {
  const lines = resumeText.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  const tabLines = lines.filter((line) => (line.match(/\t/g) ?? []).length >= 2).length;
  const pipeLines = lines.filter((line) => (line.match(/\|/g) ?? []).length >= 2).length;
  // Indentation is excluded (trimStart) so plain bullet lists don't false-positive
  const alignedLines = nonEmptyLines.filter((line) => {
    const trimmed = line.trimStart();
    return trimmed.length > 15 && / {3,}/.test(trimmed);
  }).length;

  const tests = [
    tabLines >= TAB_COLUMNS_MIN_LINES,
    pipeLines >= PIPE_COLUMNS_MIN_LINES,
    nonEmptyLines.length > 0 && alignedLines / nonEmptyLines.length > ALIGNED_SPACE_RATIO,
  ];
  const unsafe = tests.some(Boolean);

  const reasons: string[] = [];
  if (tabLines >= TAB_COLUMNS_MIN_LINES) reasons.push(`${tabLines} lines look tab-separated`);
  if (pipeLines >= PIPE_COLUMNS_MIN_LINES) reasons.push(`${pipeLines} lines use "|" separators`);
  if (tests[2]) reasons.push('many lines show wide column alignment');

  return {
    key: 'layout-tables',
    label: 'No tables, columns, or separators that break parsing',
    passed: !unsafe,
    weight: 12,
    detail: unsafe
      ? `Layout artifacts detected: ${reasons.join(', ')}. Convert to single-column text.`
      : 'Single-column, character-based layout — parses cleanly.',
  };
};

/* ------------------------------ Length sanity ----------------------------- */

const MIN_RESUME_WORDS = 150;
export const MIN_RESUME_WORDS_LIMIT = MIN_RESUME_WORDS;

export const countWords = (text: string): number => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
};

export const checkLength = (resumeText: string): AtsCheck => {
  const wordCount = countWords(resumeText);
  const passed = wordCount >= MIN_RESUME_WORDS;
  return {
    key: 'length',
    label: 'Resume length is substantial enough',
    passed,
    weight: 3,
    detail: passed
      ? `${wordCount} words extracted — comfortably above the ${MIN_RESUME_WORDS}-word floor.`
      : `Only ${wordCount} words extracted (floor: ${MIN_RESUME_WORDS}). Very short docs often fail extraction.`,
  };
};

/* --------------------------- Keyword matching ----------------------------- */

/**
 * Normalizes a keyword for comparison: lower-case, collapse whitespace.
 * "Node.js" and "node js" both become comparable tokens.
 */
export const normalizeKeyword = (keyword: string): string =>
  keyword.toLowerCase().replace(/[\s_]+/g, ' ').trim();

/**
 * Builds a safe RegExp for existence-checking a keyword in resume text.
 * Keywords that are purely alphanumeric get word boundaries ("excel" must not
 * match "excellent"); keywords containing special chars (c++, node.js, .NET,
 * C#) fall back to plain substring matching, where boundaries are less reliable.
 */
export const buildKeywordRegex = (keyword: string): RegExp => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^[a-z0-9][a-z0-9 .-]*$/.test(normalizeKeyword(keyword))) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
  return new RegExp(escaped, 'i');
};

export interface KeywordMatchResult {
  /** 0–1 fraction of the target list present in the resume */
  rate: number;
  matched: string[];
  missing: string[];
}

export const calculateKeywordMatch = (resumeText: string, targetKeywords: string[]): KeywordMatchResult => {
  const seen = new Set<string>();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of targetKeywords) {
    const normalized = normalizeKeyword(keyword);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    if (buildKeywordRegex(normalized).test(resumeText)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  const rate = seen.size === 0 ? 0 : matched.length / seen.size;
  return { rate, matched, missing };
};

/**
 * Deterministic fallback keyword extraction used when no GROQ key is present.
 * Splits on line/comma/pipe boundaries (skills are typically listed that way in
 * a resume) and drops stopwords. Not as smart as the LLM, but fully offline.
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'using', 'based', 'able', 'etc', 'about', 'over', 'under',
  'that', 'this', 'these', 'those', 'all', 'any', 'each', 'both', 'other', 'some', 'more', 'most', 'just',
  'also', 'can', 'will', 'would', 'should', 'may', 'might', 'must', 'than', 'then', 'their', 'there', 'here',
  'when', 'where', 'which', 'while', 'your', 'year', 'years', 'plus', 'one', 'two', 'new', 'get', 'use',
  'used', 'know', 'including', 'such', 'well', 'working', 'work', 'role', 'team', 'time', 'day', 'days',
  'level', 'good', 'great', 'strong', 'senior', 'junior', 'company', 'companies', 'clients', 'projects',
  'project', 'experience', 'skills', 'education', 'responsibilities', 'summary', 'through', 'within',
]);

export const extractKeywordsRuleBased = (text: string, maxKeywords = 25): string[] => {
  const candidates = text
    .split(/[\n,;|/]/)
    .map((token) => normalizeKeyword(token))
    .map((token) => token.replace(/^[\s.+#-]+|[\s.+#-]+$/g, ''))
    .filter((token) => /^[a-z0-9][a-z0-9 .+#-]{1,39}$/.test(token) && !STOPWORDS.has(token));

  return Array.from(new Set(candidates)).slice(0, maxKeywords);
};

/* ------------------------------ Score builder ----------------------------- */

export const buildAtsReport = (resumeText: string, targetKeywords: string[]): AtsReport => {
  const checks: AtsCheck[] = [
    ...checkStandardSections(resumeText),
    ...checkContactInformation(resumeText),
    checkTableLayout(resumeText),
    checkLength(resumeText),
  ];

  const comparedAgainstJd = targetKeywords.length > 0;
  let keywordCheck: AtsCheck | null = null;

  if (comparedAgainstJd) {
    const { rate, matched, missing } = calculateKeywordMatch(resumeText, targetKeywords);
    checks.push({
      key: 'keywords',
      label: 'Resume covers the job posting\u2019s key terms',
      passed: rate >= 0.6,
      weight: 50,
      detail: `${matched.length}/${targetKeywords.length} target keywords found (${Math.round(rate * 100)}%).`,
    });

    // Keywords contribute proportionally to the match rate, all other checks
    // contribute fully when passed
    const keywordWeight = 50;
    const available = checks.reduce((sum, item) => sum + item.weight, 0);
    const earned =
      checks.filter((item) => item.key !== 'keywords' && item.passed).reduce((sum, item) => sum + item.weight, 0) +
      keywordWeight * rate;
    const score = available === 0 ? 0 : Math.round((earned / available) * 100);

    return {
      score,
      keywordMatchRate: rate,
      matchedKeywords: matched,
      missingKeywords: missing,
      checks,
      resumeWordCount: countWords(resumeText),
      comparedAgainstJd,
    };
  }

  // No JD supplied: no keyword check, so normalize against the available weight
  const available = checks.reduce((sum, item) => sum + item.weight, 0);
  const earned = checks.filter((item) => item.passed).reduce((sum, item) => sum + item.weight, 0);
  const score = available === 0 ? 0 : Math.round((earned / available) * 100);

  return {
    score,
    keywordMatchRate: null,
    matchedKeywords: [],
    missingKeywords: [],
    checks,
    resumeWordCount: countWords(resumeText),
    comparedAgainstJd,
  };
};