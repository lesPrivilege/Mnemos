// Haptic feedback — thin Capacitor wrapper, native-only.
// All functions early-return on web; all failures silent.
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from './platform'

export async function hapticLight() {
  if (!isNative()) return
  try { await Haptics.impact({ style: ImpactStyle.Light }) } catch {}
}

export async function hapticMedium() {
  if (!isNative()) return
  try { await Haptics.impact({ style: ImpactStyle.Medium }) } catch {}
}

export async function hapticSuccess() {
  if (!isNative()) return
  try { await Haptics.notification({ type: NotificationType.Success }) } catch {}
}

export async function hapticWarning() {
  if (!isNative()) return
  try { await Haptics.notification({ type: NotificationType.Warning }) } catch {}
}
