/**
 * Calm Quest — the keepsake plate (build 13).
 *
 * The vellum reading surface the Glimpse flow already uses to show an entry
 * back to its writer (screen §3.4.3: `vellum` fill, a 3px theme left rule,
 * serif italic reading voice, the line in quotes). Build 13 renders the same
 * treatment in three more places — every row of the kept archive, the reading
 * view you get when you re-open one, and the saved-affirmation cards — so a
 * user's own words always look the same wherever they are kept.
 *
 * Presentation only: no state, no copy of its own, no XP. The `accent` prop is
 * paint (a theme accent), never text.
 */

import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typeScale } from '../theme';

export function KeepsakePlate({
  text,
  accent,
  style,
}: {
  /** The user's own line, rendered verbatim. */
  text: string;
  /** The 3px left rule's colour — a theme accent (paint, not ink). */
  accent: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.plate, { borderLeftColor: accent }, style]}>
      <Text style={typeScale.reading}>{`“${text}”`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: colors.vellum,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
