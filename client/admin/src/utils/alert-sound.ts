// ============================================================
// Alert sound — a short "ding-ding" chime made with the Web Audio API (no sound file to load).
// Browsers keep audio muted until the person taps/clicks the page once. `installAlertSoundUnlock`
// (called at app start) unlocks on the first tap anywhere — including the login button — so later
// alerts can ring on their own. iPhones only count click/touchend as a tap for audio, not touchstart.
// ============================================================

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
const listeners = new Set<(ready: boolean) => void>();

const notify = () => listeners.forEach((cb) => cb(isAlertSoundReady()));

const getContext = (): AudioContext | null => {
  if (ctx) return ctx;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  ctx.onstatechange = notify;
  return ctx;
};

/** True once the browser lets this page play sound. */
export const isAlertSoundReady = (): boolean => ctx?.state === 'running';

/** Get told when sound becomes allowed / blocked again (e.g. iPhone suspends audio in the background). */
export const onAlertSoundChange = (cb: (ready: boolean) => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Must run inside a user gesture (click / tap / key press). */
export const unlockAlertSound = async (): Promise<boolean> => {
  const audio = getContext();
  if (!audio) return false;
  try {
    // iOS only unlocks once something actually plays inside the tap: a 1-sample silent buffer
    const src = audio.createBufferSource();
    src.buffer = audio.createBuffer(1, 1, 22050);
    src.connect(audio.destination);
    src.start(0);
    if (audio.state !== 'running') await audio.resume();
  } catch {
    return false;
  }
  notify();
  return audio.state === 'running';
};

/** Try to resume after the tab comes back (works without a tap once the page was unlocked before). */
export const resumeAlertSound = async (): Promise<boolean> => {
  if (!ctx) return false;
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      /* needs a tap again */
    }
  }
  notify();
  return isAlertSoundReady();
};

let installed = false;

/** Unlock sound on the first tap anywhere in the app. Keeps listening until it works. */
export const installAlertSoundUnlock = (): void => {
  if (installed) return;
  installed = true;
  const events = ['click', 'touchend', 'keydown'] as const;
  const onGesture = () => {
    if (isAlertSoundReady()) return;
    void unlockAlertSound();
  };
  events.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void resumeAlertSound();
  });
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

/** Rings twice ("ding-dong, ding-dong") and stops. Does nothing if the browser hasn't allowed sound yet. */
export const playAlertSound = (): void => {
  const audio = getContext();
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  [0, 0.7].forEach((offset) => {
    tone(audio, 880, now + offset, 0.25);
    tone(audio, 1320, now + offset + 0.2, 0.35);
  });
};
