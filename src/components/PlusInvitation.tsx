/**
 * Calm Quest — the gold invitation family (build 13).
 *
 * Two pieces, one grammar: a `goldTint` line that states a fact about what is
 * beyond the free shelf, and the app's existing `UpgradeInvitation` door under
 * it. Both build-13 gates (the archive's last-7 line, the free verse shelf) use
 * this, so the two never drift into two different kinds of nudge.
 *
 * The rules it keeps: no padlock, no count, no urgency, no guilt, nothing
 * dimmed — the free rows above stay at full contrast and keep working exactly
 * as they did. The CTA label is the string the app already ships in its gated
 * content verbatim (`PLUS_INVITATION_LABEL` below), and it opens the SAME
 * paywall route the evidence, the glimpse cap and Settings already open.
 *
 * Hooks-free and copy-light by design: the line arrives as a prop so each
 * surface's exact wording lives in that screen's COPY map (and in
 * NEW_STRINGS.md for the owner's single review pass).
 */

import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme';
import { UpgradeInvitation } from './UpgradeInvitation';

// --- COPY (build 13) — mirrored verbatim in NEW_STRINGS.md ---
/** REUSED verbatim: the app's existing gated-content invitation label. */
export const PLUS_INVITATION_LABEL = 'See what Calm Quest+ includes';
// --- /COPY ---

export function PlusInvitation({
  line,
  onPress,
  style,
}: {
  /** The one honest sentence about what the tier holds back. */
  line: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <View style={styles.line}>
        <Text style={styles.lineText}>{line}</Text>
      </View>
      <UpgradeInvitation label={PLUS_INVITATION_LABEL} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    alignSelf: 'stretch',
    backgroundColor: colors.goldTint,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  lineText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.goldDeep,
  },
});
