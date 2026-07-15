import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Feedback tátil para ações importantes. No web (sem motor háptico) vira no-op.
 * Sempre `.catch` — falha de háptico nunca deve quebrar um fluxo.
 */

export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticError() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

export function hapticWarning() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}

export function hapticSelection() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => undefined);
}

export function hapticLight() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
