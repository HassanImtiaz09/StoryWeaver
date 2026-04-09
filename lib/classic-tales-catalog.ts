export interface ClassicTale {
  id: string;
  title: string;
  originalAuthor: string;
  origin: string;           // "Brothers Grimm", "Aesop's Fables", "Hans Christian Andersen", etc.
  ageRange: [number, number]; // min/max suitable age
  themes: string[];
  summary: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'advanced';
  iconEmoji: string;
  coverGradient: [string, string];
  moralLesson: string;
  personalizableElements: string[]; // what can be customized ("hero name", "setting", "pet companion")
}

export const CLASSIC_TALES: ClassicTale[] = [
  {
    id: 'three-little-pigs',
    title: 'The Three Little Pigs',
    originalAuthor: 'Joseph Jacobs',
    origin: 'English Fairy Tale',
    ageRange: [3, 7],
    themes: ['perseverance', 'hard work', 'planning ahead'],
    summary: 'Three pig siblings each build a house, learning that careful work pays off when a wolf comes calling.',
    estimatedMinutes: 8,
    difficulty: 'easy',
    iconEmoji: '🐷',
    coverGradient: ['#FF9A9E', '#FECFEF'],
    moralLesson: 'Hard work and planning ahead lead to the best results.',
    personalizableElements: ['hero name', 'building materials', 'villain animal'],
  },
  {
    id: 'goldilocks',
    title: 'Goldilocks and the Three Bears',
    originalAuthor: 'Robert Southey',
    origin: 'English Fairy Tale',
    ageRange: [3, 6],
    themes: ['respect', 'curiosity', 'boundaries'],
    summary: 'A curious child explores a bear family\'s home and learns about respecting others\' belongings.',
    estimatedMinutes: 7,
    difficulty: 'easy',
    iconEmoji: '🐻',
    coverGradient: ['#FFD93D', '#FF6B6B'],
    moralLesson: 'Always respect other people\'s things and spaces.',
    personalizableElements: ['hero name', 'animal family', 'setting'],
  },
  {
    id: 'tortoise-hare',
    title: 'The Tortoise and the Hare',
    originalAuthor: 'Aesop',
    origin: 'Aesop\'s Fables',
    ageRange: [3, 8],
    themes: ['perseverance', 'humility', 'steady effort'],
    summary: 'A slow but steady tortoise wins a race against a fast but overconfident hare.',
    estimatedMinutes: 6,
    difficulty: 'easy',
    iconEmoji: '🐢',
    coverGradient: ['#22C55E', '#4ADE80'],
    moralLesson: 'Slow and steady wins the race.',
    personalizableElements: ['hero name', 'race type', 'animal characters'],
  },
  {
    id: 'little-red-riding-hood',
    title: 'Little Red Riding Hood',
    originalAuthor: 'Charles Perrault',
    origin: 'French Fairy Tale',
    ageRange: [4, 8],
    themes: ['caution', 'family love', 'stranger awareness'],
    summary: 'A child on a journey to grandmother\'s house learns the importance of staying safe.',
    estimatedMinutes: 10,
    difficulty: 'easy',
    iconEmoji: '🧣',
    coverGradient: ['#EF4444', '#F97316'],
    moralLesson: 'Be careful who you trust, and always listen to wise advice.',
    personalizableElements: ['hero name', 'gift for grandma', 'forest setting', 'helpful character'],
  },
  {
    id: 'jack-beanstalk',
    title: 'Jack and the Beanstalk',
    originalAuthor: 'Benjamin Tabart',
    origin: 'English Fairy Tale',
    ageRange: [4, 9],
    themes: ['bravery', 'adventure', 'resourcefulness'],
    summary: 'A brave young adventurer climbs a magical beanstalk to a land in the clouds.',
    estimatedMinutes: 12,
    difficulty: 'medium',
    iconEmoji: '🌱',
    coverGradient: ['#16A34A', '#65A30D'],
    moralLesson: 'Courage and quick thinking can overcome great challenges.',
    personalizableElements: ['hero name', 'magic item', 'cloud world theme', 'giant personality'],
  },
  {
    id: 'ugly-duckling',
    title: 'The Ugly Duckling',
    originalAuthor: 'Hans Christian Andersen',
    origin: 'Danish Fairy Tale',
    ageRange: [4, 9],
    themes: ['self-acceptance', 'patience', 'inner beauty'],
    summary: 'A young bird who feels different discovers their true beautiful self.',
    estimatedMinutes: 10,
    difficulty: 'medium',
    iconEmoji: '🦢',
    coverGradient: ['#818CF8', '#C084FC'],
    moralLesson: 'Everyone has their own special beauty — sometimes you just need time to find it.',
    personalizableElements: ['hero name', 'animal type', 'hidden talent', 'supportive friend'],
  },
  {
    id: 'pied-piper',
    title: 'The Pied Piper',
    originalAuthor: 'Brothers Grimm',
    origin: 'German Fairy Tale',
    ageRange: [5, 10],
    themes: ['keeping promises', 'honesty', 'consequences'],
    summary: 'A magical musician helps a town with a problem, teaching everyone about keeping promises.',
    estimatedMinutes: 11,
    difficulty: 'medium',
    iconEmoji: '🎵',
    coverGradient: ['#8B5CF6', '#6366F1'],
    moralLesson: 'Always keep your promises — breaking them can have consequences.',
    personalizableElements: ['musician instrument', 'town name', 'problem type', 'hero name'],
  },
  {
    id: 'rapunzel',
    title: 'Rapunzel',
    originalAuthor: 'Brothers Grimm',
    origin: 'German Fairy Tale',
    ageRange: [5, 10],
    themes: ['freedom', 'courage', 'friendship'],
    summary: 'A resourceful young person in a tall tower finds a creative way to explore the world.',
    estimatedMinutes: 12,
    difficulty: 'medium',
    iconEmoji: '🏰',
    coverGradient: ['#F472B6', '#EC4899'],
    moralLesson: 'True freedom comes from courage and the help of good friends.',
    personalizableElements: ['hero name', 'tower location', 'special talent', 'animal companion'],
  },
  {
    id: 'snow-queen',
    title: 'The Snow Queen',
    originalAuthor: 'Hans Christian Andersen',
    origin: 'Danish Fairy Tale',
    ageRange: [6, 11],
    themes: ['friendship', 'bravery', 'love conquers fear'],
    summary: 'A brave friend embarks on an epic journey through a frozen land to rescue their best friend.',
    estimatedMinutes: 15,
    difficulty: 'advanced',
    iconEmoji: '❄️',
    coverGradient: ['#38BDF8', '#0EA5E9'],
    moralLesson: 'True friendship and love can overcome even the coldest hearts.',
    personalizableElements: ['hero name', 'friend name', 'frozen land theme', 'magical item'],
  },
  {
    id: 'aladdin',
    title: 'Aladdin and the Magic Lamp',
    originalAuthor: 'Antoine Galland',
    origin: 'One Thousand and One Nights',
    ageRange: [5, 11],
    themes: ['honesty', 'being yourself', 'wise wishes'],
    summary: 'A clever young person finds a magical lamp and learns that the best wishes come from the heart.',
    estimatedMinutes: 14,
    difficulty: 'medium',
    iconEmoji: '🪔',
    coverGradient: ['#D97706', '#F59E0B'],
    moralLesson: 'Be yourself — true worth comes from who you are, not what you have.',
    personalizableElements: ['hero name', 'magical item', 'wishes', 'marketplace setting'],
  },
  {
    id: 'alice-wonderland',
    title: 'Alice in Wonderland',
    originalAuthor: 'Lewis Carroll',
    origin: 'English Literature',
    ageRange: [6, 12],
    themes: ['curiosity', 'imagination', 'thinking differently'],
    summary: 'A curious adventurer falls into a topsy-turvy world where nothing is quite what it seems.',
    estimatedMinutes: 16,
    difficulty: 'advanced',
    iconEmoji: '🐇',
    coverGradient: ['#A855F7', '#7C3AED'],
    moralLesson: 'Curiosity and imagination can open doors to amazing discoveries.',
    personalizableElements: ['hero name', 'wonderland theme', 'quirky characters', 'riddle type'],
  },
  {
    id: 'robin-hood',
    title: 'Robin Hood',
    originalAuthor: 'English Folklore',
    origin: 'English Legend',
    ageRange: [7, 12],
    themes: ['fairness', 'helping others', 'standing up for right'],
    summary: 'A skilled archer and their band of friends work together to help those in need.',
    estimatedMinutes: 15,
    difficulty: 'advanced',
    iconEmoji: '🏹',
    coverGradient: ['#15803D', '#16A34A'],
    moralLesson: 'Standing up for what is right, even when it\'s hard, makes the world better.',
    personalizableElements: ['hero name', 'special skill', 'forest setting', 'team members'],
  },
];

// ─── Helper functions ─────────────────────────────────────────
export function getTalesForAge(age: number): ClassicTale[] {
  return CLASSIC_TALES.filter(t => age >= t.ageRange[0] && age <= t.ageRange[1]);
}

export function getTalesByTheme(theme: string): ClassicTale[] {
  return CLASSIC_TALES.filter(t => t.themes.includes(theme));
}

export function getTalesByDifficulty(difficulty: ClassicTale['difficulty']): ClassicTale[] {
  return CLASSIC_TALES.filter(t => t.difficulty === difficulty);
}

export function getAllThemes(): string[] {
  const themes = new Set<string>();
  CLASSIC_TALES.forEach(t => t.themes.forEach(theme => themes.add(theme)));
  return [...themes].sort();
}

export function searchTales(query: string): ClassicTale[] {
  const q = query.toLowerCase();
  return CLASSIC_TALES.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.themes.some(theme => theme.includes(q)) ||
    t.origin.toLowerCase().includes(q) ||
    t.originalAuthor.toLowerCase().includes(q)
  );
}
