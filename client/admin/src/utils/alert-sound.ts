// ============================================================
// Alert sound — a short "ding-ding" chime made with the Web Audio API (no sound file to load).
// Browsers keep audio muted until the person taps/clicks the page once; `unlockAlertSound`
// is called on the first tap so later alerts can ring on their own.
// ============================================================

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (ctx) return ctx;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
};

/** True once the browser lets this page play sound. */
export const isAlertSoundReady = (): boolean => ctx?.state === 'running';

/** Must run inside a user gesture (click / tap / key press). */
export const unlockAlertSound = async (): Promise<boolean> => {
  const audio = getContext();
  if (!audio) return false;
  if (audio.state !== 'running') {
    try {
      await audio.resume();
    } catch {
      return false;
    }
  }
  return audio.state === 'running';
};

const tone = (audio: AudioContext, frequency: number, start: number, duration: number) => {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

/** Two-tone chime, played twice. Silently does nothing if the browser hasn't allowed sound yet. */
export const playAlertSound = (): void => {
  const audio = getContext();
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  [0, 0.7].forEach((offset) => {
    tone(audio, 880, now + offset, 0.25);
    tone(audio, 1320, now + offset + 0.2, 0.35);
  });
};
