import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Content Safety Levels ────────────────────────────────────
export type SafetyLevel = 'strict' | 'moderate' | 'relaxed';

export interface ContentFilterResult {
  safe: boolean;
  flags: ContentFlag[];
  safetyScore: number; // 0-100, higher = safer
  filteredText?: string; // sanitized version if needed
}

export interface ContentFlag {
  category: FlagCategory;
  severity: 'low' | 'medium' | 'high';
  match: string;
  suggestion?: string;
}

export type FlagCategory =
  | 'violence'
  | 'scary_content'
  | 'inappropriate_language'
  | 'mature_themes'
  | 'bullying'
  | 'dangerous_activity';

// ─── Keyword dictionaries by category ─────────────────────────
// These are conservative patterns appropriate for a children's app.
// In production, these would be supplemented by server-side ML classification.

const PATTERNS: Record<FlagCategory, { patterns: RegExp[]; severity: 'low' | 'medium' | 'high' }[]> = {
  violence: [
    { patterns: [/\b(kill(s|ed|ing)?|murder(s|ed|ing)?|slaughter)\b/i], severity: 'high' },
    { patterns: [/\b(stab(s|bed|bing)?|shoot(s|ing)?|shot)\b/i], severity: 'high' },
    { patterns: [/\b(blood(y)?|bleed(s|ing)?|wound(s|ed)?)\b/i], severity: 'medium' },
    { patterns: [/\b(fight(s|ing)?|punch(es|ed|ing)?|kick(s|ed|ing)?)\b/i], severity: 'low' },
  ],
  scary_content: [
    { patterns: [/\b(demon|devil|satan|hell)\b/i], severity: 'high' },
    { patterns: [/\b(nightmare|terror|horror|scream(s|ed|ing)?)\b/i], severity: 'medium' },
    { patterns: [/\b(ghost(s|ly)?|haunt(s|ed|ing)?|spook(s|y|ed)?)\b/i], severity: 'low' },
  ],
  inappropriate_language: [
    { patterns: [/\b(damn|hell|crap|stupid|idiot|dumb|shut\s*up)\b/i], severity: 'medium' },
    { patterns: [/\b(hate(s|d)?|ugly|fat|loser)\b/i], severity: 'low' },
  ],
  mature_themes: [
    { patterns: [/\b(death|die(s|d)?|dying|dead|funeral|grave)\b/i], severity: 'medium' },
    { patterns: [/\b(divorce|abandon(s|ed|ing)?|drunk|alcohol|drug)\b/i], severity: 'high' },
    { patterns: [/\b(war|weapon(s)?|gun(s)?|bomb(s)?)\b/i], severity: 'high' },
  ],
  bullying: [
    { patterns: [/\b(bully|bullied|bullying|teasing|tease(s|d)?)\b/i], severity: 'medium' },
    { patterns: [/\b(mean|cruel|nasty|worthless)\b/i], severity: 'low' },
  ],
  dangerous_activity: [
    { patterns: [/\b(poison(s|ed|ous)?|drown(s|ed|ing)?)\b/i], severity: 'high' },
    { patterns: [/\b(fire\s*play|run(ning)?\s*away|stranger\s*danger)\b/i], severity: 'medium' },
  ],
};

// ─── Severity thresholds by safety level ──────────────────────
const THRESHOLDS: Record<SafetyLevel, { blockOn: 'low' | 'medium' | 'high'; scoreDeduction: Record<string, number> }> = {
  strict: {
    blockOn: 'low',
    scoreDeduction: { low: 15, medium: 30, high: 50 },
  },
  moderate: {
    blockOn: 'medium',
    scoreDeduction: { low: 5, medium: 20, high: 40 },
  },
  relaxed: {
    blockOn: 'high',
    scoreDeduction: { low: 2, medium: 10, high: 30 },
  },
};

// ─── Storage ──────────────────────────────────────────────────
const SETTINGS_KEY = 'sw_content_filter_settings';

export interface ContentFilterSettings {
  safetyLevel: SafetyLevel;
  requireParentalReview: boolean;
  blockedCategories: FlagCategory[];
  customBlockedWords: string[];
}

const DEFAULT_SETTINGS: ContentFilterSettings = {
  safetyLevel: 'moderate',
  requireParentalReview: false,
  blockedCategories: [],
  customBlockedWords: [],
};

export async function getFilterSettings(): Promise<ContentFilterSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveFilterSettings(settings: Partial<ContentFilterSettings>): Promise<void> {
  try {
    const current = await getFilterSettings();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch {
    // Silently fail
  }
}

// ─── Text normalization to prevent bypass attacks ──────────────

/**
 * Normalizes text to prevent common bypass techniques:
 * - Strips diacritics/accents (é→e, ñ→n)
 * - Replaces leet-speak substitutions (0→o, 1→i/l, 3→e, etc.)
 * - Removes repeated characters beyond 2 (killlll→kill)
 * - Removes zero-width and invisible Unicode characters
 * - Converts to lowercase
 */
function normalizeText(text: string): string {
  // Remove zero-width characters and other invisible Unicode
  let normalized = text.replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, '');

  // Strip diacritics/accents using NFD normalization
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Replace leet-speak and common character substitutions
  normalized = normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');

  // Remove repeated characters beyond 2 (e.g., killlll → kill)
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * Classic Soundex algorithm for phonetic matching.
 * Converts words to a phonetic code (e.g., "kill" → "K400").
 * Useful for detecting phonetically similar variations of dangerous words.
 */
function soundex(word: string): string {
  const s = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';

  const firstLetter = s[0];
  const codes: Record<string, string> = {
    B: '1',
    F: '1',
    P: '1',
    V: '1',
    C: '2',
    G: '2',
    J: '2',
    K: '2',
    Q: '2',
    S: '2',
    X: '2',
    Z: '2',
    D: '3',
    T: '3',
    L: '4',
    M: '5',
    N: '5',
    R: '6',
  };

  let code = firstLetter;
  let lastCode = codes[firstLetter] || '';

  for (let i = 1; i < s.length && code.length < 4; i++) {
    const c = codes[s[i]] || '';
    if (c && c !== lastCode) {
      code += c;
      lastCode = c;
    } else if (!c) {
      lastCode = '';
    }
  }

  // Pad with zeros to make it 4 characters
  return (code + '000').substring(0, 4);
}

/**
 * Map of Soundex codes for high-severity dangerous words.
 * These are words we want to catch even with phonetic variations.
 */
const PHONETIC_BLOCKLIST: Record<string, { word: string; severity: 'high' | 'medium' }> = {
  K400: { word: 'kill', severity: 'high' }, // kill, kil, kuhl, etc.
  M630: { word: 'murder', severity: 'high' }, // murder, murda, etc.
  S300: { word: 'stab', severity: 'high' }, // stab, stabb, etc.
  S100: { word: 'shoot', severity: 'high' }, // shoot, soot, etc.
  D620: { word: 'drug', severity: 'high' }, // drug, drig, etc.
  W400: { word: 'weapon', severity: 'high' }, // weapon, wepon, etc.
  P650: { word: 'poison', severity: 'high' }, // poison, poisin, etc.
  S400: { word: 'stab', severity: 'high' }, // stab variant
  B500: { word: 'bomb', severity: 'high' }, // bomb, bumb, etc.
};

// ─── Core filter function ─────────────────────────────────────
export function filterContent(
  text: string,
  safetyLevel: SafetyLevel = 'moderate',
  extraBlockedWords: string[] = [],
  blockedCategories: FlagCategory[] = []
): ContentFilterResult {
  const flags: ContentFlag[] = [];
  let score = 100;
  const threshold = THRESHOLDS[safetyLevel];

  // Normalize the text to catch bypass attempts
  const normalizedText = normalizeText(text);

  // Check each category using both original and normalized text
  for (const [category, rules] of Object.entries(PATTERNS)) {
    const cat = category as FlagCategory;
    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        // Check against original text (for standard patterns)
        const matches = text.match(new RegExp(pattern, 'gi'));
        if (matches) {
          for (const match of matches) {
            flags.push({
              category: cat,
              severity: rule.severity,
              match,
            });
            score -= threshold.scoreDeduction[rule.severity] || 10;
          }
        }

        // Also check against normalized text to catch bypasses
        const normalizedMatches = normalizedText.match(new RegExp(pattern.source, 'gi'));
        if (normalizedMatches && !matches) {
          // Only flag if we didn't already catch it in the original
          for (const match of normalizedMatches) {
            flags.push({
              category: cat,
              severity: rule.severity,
              match: `${match} (obfuscated)`,
              suggestion: 'Potential bypass attempt detected',
            });
            score -= threshold.scoreDeduction[rule.severity] || 10;
          }
        }
      }
    }
  }

  // Check custom blocked words against normalized text
  for (const word of extraBlockedWords) {
    if (word.trim()) {
      const regex = new RegExp(`\\b${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      const normalizedMatches = normalizedText.match(regex);

      if (matches || normalizedMatches) {
        const allMatches = matches || normalizedMatches || [];
        for (const match of allMatches) {
          flags.push({
            category: 'inappropriate_language',
            severity: 'medium',
            match: matches ? match : `${match} (obfuscated)`,
            suggestion: 'Custom blocked word',
          });
          score -= 20;
        }
      }
    }
  }

  // Phonetic matching for high-severity words
  // Split normalized text into words and check their Soundex codes
  const words = normalizedText.split(/\s+/);
  const processedSoundexes = new Set<string>();

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 0) {
      const code = soundex(cleanWord);
      // Avoid duplicate flagging of the same Soundex match
      if (code in PHONETIC_BLOCKLIST && !processedSoundexes.has(code)) {
        const blockedInfo = PHONETIC_BLOCKLIST[code];
        flags.push({
          category: 'violence',
          severity: blockedInfo.severity,
          match: word,
          suggestion: `phonetic_match: "${blockedInfo.word}" detected via phonetic analysis`,
        });
        score -= threshold.scoreDeduction[blockedInfo.severity] || 10;
        processedSoundexes.add(code);
      }
    }
  }

  // Check if any explicitly blocked category is present
  const hasBlockedCategory = flags.some(f => blockedCategories.includes(f.category));

  // Determine if content is safe based on threshold
  const severityOrder = { low: 0, medium: 1, high: 2 };
  const blockLevel = severityOrder[threshold.blockOn];
  const hasBlockingFlag = flags.some(f => severityOrder[f.severity] >= blockLevel);

  const safe = !hasBlockingFlag && !hasBlockedCategory && score >= 50;

  return {
    safe,
    flags,
    safetyScore: Math.max(0, Math.min(100, score)),
  };
}

// ─── Parental review queue ────────────────────────────────────
const REVIEW_QUEUE_KEY = 'sw_parental_review_queue';

export interface ReviewItem {
  id: string;
  episodeId: number;
  pageIndex: number;
  text: string;
  flags: ContentFlag[];
  safetyScore: number;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export async function addToReviewQueue(item: Omit<ReviewItem, 'id' | 'timestamp' | 'status'>): Promise<void> {
  try {
    const queue = await getReviewQueue();
    const newItem: ReviewItem = {
      ...item,
      id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      status: 'pending',
    };
    queue.push(newItem);
    // Keep only last 100 items
    const trimmed = queue.slice(-100);
    await AsyncStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail
  }
}

export async function getReviewQueue(): Promise<ReviewItem[]> {
  try {
    const stored = await AsyncStorage.getItem(REVIEW_QUEUE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function updateReviewItem(id: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const queue = await getReviewQueue();
    const updated = queue.map(item =>
      item.id === id ? { ...item, status } : item
    );
    await AsyncStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

export async function getPendingReviewCount(): Promise<number> {
  const queue = await getReviewQueue();
  return queue.filter(item => item.status === 'pending').length;
}
