"use client";

/**
 * Haptic feedback utility for native-feeling mobile interactions.
 * Uses the Vibration API where supported (Android Chrome, etc.)
 * Falls back silently on iOS/desktop.
 */

export function hapticLight() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(5);
  }
}

export function hapticMedium() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(15);
  }
}

export function hapticHeavy() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([20, 30, 20]);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([5, 50, 10]);
  }
}

export function hapticWarning() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([15, 40, 15, 40, 15]);
  }
}
