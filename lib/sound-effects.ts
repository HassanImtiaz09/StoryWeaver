import { Audio } from "expo-av";
import { getSettings, saveSettings } from "@/lib/settings-store";

// Sound effects are short tone sequences generated at runtime
// No audio files needed - uses expo-av with data URI WAV format

let soundEnabledCache: boolean | null = null;

// ─── Race-condition prevention ────────────────────────────────
// Mutex lock prevents overlapping sound sequences.
// Active sounds are tracked for cleanup on unmount or rapid re-trigger.
let isPlaying = false;
const activeSounds: Set<Audio.Sound> = new Set();

export async function loadSoundPreference() {
  try {
    const settings = await getSettings();
    soundEnabledCache = settings.soundEffectsEnabled;
  } catch {
    // Default to enabled if settings fail
    soundEnabledCache = true;
  }
}

export async function setSoundEnabled(enabled: boolean) {
  soundEnabledCache = enabled;
  try {
    await saveSettings({ soundEffectsEnabled: enabled });
  } catch {
    // Silently fail if storage unavailable
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabledCache !== false;
}

/**
 * Immediately unload all active sound instances.
 * Safe to call from component cleanup / unmount.
 */
export async function releaseAllSounds() {
  const toRelease = [...activeSounds];
  activeSounds.clear();
  isPlaying = false;
  await Promise.allSettled(
    toRelease.map((s) => s.unloadAsync().catch(() => {}))
  );
}

// Generate a simple sine wave WAV as base64
function generateToneWav(frequency: number, duration: number, volume: number = 0.3): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Generate sine wave with fade out
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeOut = 1 - i / numSamples;
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * fadeOut * 32767;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample)), true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Play a sequence of tones with mutex guard and per-sound tracking
async function playToneSequence(
  tones: { freq: number; dur: number }[],
  gap: number
) {
  // If a sequence is already playing, skip to prevent overlap
  if (isPlaying) return;
  isPlaying = true;

  try {
    for (const tone of tones) {
      // Bail out if another call reset the lock (e.g. releaseAllSounds)
      if (!isPlaying) return;

      let sound: Audio.Sound | null = null;
      try {
        const wav = generateToneWav(tone.freq, tone.dur);
        const { sound: created } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${wav}` },
          { shouldPlay: true, volume: 0.6 }
        );
        sound = created;
        activeSounds.add(sound);

        // Wait for tone to complete
        await new Promise((r) => setTimeout(r, tone.dur * 1000 + gap));
      } catch {
        // Silently fail if audio system unavailable
      } finally {
        // Always clean up the individual sound
        if (sound) {
          activeSounds.delete(sound);
          try {
            await sound.unloadAsync();
          } catch {
            // Already unloaded or unavailable
          }
        }
      }
    }
  } finally {
    isPlaying = false;
  }
}

// Play a short success chime (ascending major chord arpeggio: C5, E5, G5)
export async function playBadgeUnlock() {
  if (!isSoundEnabled()) return;
  try {
    await playToneSequence(
      [
        { freq: 523, dur: 0.12 },
        { freq: 659, dur: 0.12 },
        { freq: 784, dur: 0.25 },
      ],
      100
    );
  } catch {
    // Silently fail
  }
}

// Quick two-note success (G4, C5)
export async function playMissionComplete() {
  if (!isSoundEnabled()) return;
  try {
    await playToneSequence(
      [
        { freq: 392, dur: 0.1 },
        { freq: 523, dur: 0.15 },
      ],
      80
    );
  } catch {
    // Silently fail
  }
}

// Gentle pop for sticker reveal (single high note)
export async function playStickerPeel() {
  if (!isSoundEnabled()) return;
  try {
    await playToneSequence(
      [
        { freq: 880, dur: 0.08 },
      ],
      0
    );
  } catch {
    // Silently fail
  }
}

// Fanfare sound (C5, E5, G5, C6)
export async function playLevelUp() {
  if (!isSoundEnabled()) return;
  try {
    await playToneSequence(
      [
        { freq: 523, dur: 0.1 },
        { freq: 659, dur: 0.1 },
        { freq: 784, dur: 0.1 },
        { freq: 1047, dur: 0.3 },
      ],
      80
    );
  } catch {
    // Silently fail
  }
}
