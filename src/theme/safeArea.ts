/**
 * Calm Quest — screen safe-area helper (on-device bug fix, Sep 2026).
 *
 * Every screen draws its own design padding (the `spacing.*` tokens). On a
 * notched / Dynamic-Island iPhone that padding starts at the very top of the
 * display, so the header area rendered under the status bar and the camera
 * cutout. This hook adds the device's safe-area inset ON TOP of the screen's
 * own design values — the inset is additive, never a replacement — so the
 * layout on a device without insets is unchanged from the design.
 *
 * Needs a <SafeAreaProvider> ancestor: mounted once in App.tsx.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * `{ paddingTop, paddingBottom }` = your design paddings + the device insets.
 * Append it AFTER the screen's static container style in the style array.
 */
export function useScreenInsets(top: number, bottom: number) {
  const insets = useSafeAreaInsets();
  return { paddingTop: top + insets.top, paddingBottom: bottom + insets.bottom };
}
