"use client";

// iOS doesn't support navigator.vibrate — use AudioContext for tap sound + CSS handles visual feedback
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  return audioCtx;
}

function tick(freq: number, duration: number, volume: number) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {}
  // Also try vibrate for Android
  try { navigator?.vibrate?.(duration * 0.8); } catch {}
}

export const haptic = {
  light() { tick(4000, 8, 0.015); },
  medium() { tick(3000, 15, 0.025); },
  heavy() { tick(2000, 25, 0.04); },
  success() { tick(5000, 6, 0.015); setTimeout(() => tick(6000, 6, 0.015), 80); },
  warning() { tick(2500, 12, 0.03); setTimeout(() => tick(2500, 12, 0.03), 60); },
};
