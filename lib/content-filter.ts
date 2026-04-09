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

  // Check each category
  for (const [category, rules] of Object.entries(PATTERNS)) {
    const cat = category as FlagCategory;
    for (const rule of rules) {
      for (const pattern of rule.patterns) {
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
      }
    }
  }

  // Check custom blocked words
  for (const word of extraBlockedWords) {
    if (word.trim()) {
      const regex = new RegExp(`\\b${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        for (const match of matches) {
          flags.push({
            category: 'inappropriate_language',
            severity: 'medium',
            match,
            suggestion: 'Custom blocked word',
          });
          score -= 20;
        }
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
