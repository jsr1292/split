/**
 * Haptic feedback utility
 * Provides subtle device vibration feedback for key interactions
 */
export function haptic(ms = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

// Specific haptic patterns for different interactions
export const hapticLight = () => haptic(5);
export const hapticMedium = () => haptic(10);
export const hapticStrong = () => haptic(15);
