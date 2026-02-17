export const haptic = {
  light() { navigator?.vibrate?.(4); },
  medium() { navigator?.vibrate?.(12); },
  heavy() { navigator?.vibrate?.([15, 30, 15]); },
  success() { navigator?.vibrate?.([4, 60, 8]); },
  warning() { navigator?.vibrate?.([12, 40, 12, 40, 12]); },
};
