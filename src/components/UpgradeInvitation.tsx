/**
 * Calm Quest — the upgrade invitation (owner request, Sep 2026).
 *
 * A FREE user's Settings Calm Quest+ card used to be a sign with no door: it
 * named the tier and showed which themes were held, but the only route to the
 * paywall ran through gated content. This is the door — one tappable row,
 * rendered for a FREE user only, that opens the SAME `PaywallScreen` the gates
 * open. It owns no purchase logic, no state and no copy: the label arrives as a
 * prop (the approved string lives in the screen's COPY map) and the tap is
 * forwarded to the screen's handler, which does the navigating. Hooks-free on
 * purpose, so the proof suite can invoke it and walk its tree.
 *
 * Presentation (docs/VISUAL.md rules — this adds no new token and no new hue):
 *  - Gold is the value/invitation family, so the door is `goldTint` paint inside
 *    a 1px `gold` hairline, with the label in `goldDeep` and the drawn
 *    `ChevronMark` pointing through it. A picture of "there is more, and you can
 *    walk in" — never a wall, never a padlock, never a countdown.
 *  - Secondary-CTA parity: it is built on `buttons.ghost` + `buttons.ghostText`,
 *    so it matches the Restore / Manage rows it sits above in type size, weight
 *    and horizontal padding. The 1px hairline is paid back out of the vertical
 *    padding (`14 - 1`), so all three rows are exactly the same height — an
 *    invitation, not a bigger button.
 *  - Accessibility: the row is a real `button` named by its label. The chevron
 *    is a `Mark` (hidden from assistive tech, transparent to touches), so
 *    VoiceOver hears "Upgrade to Calm Quest+, button" and nothing else.
 *
 * No urgency, no scarcity, no fake deadline, and nothing is ever charged here —
 * the tap only shows the plans.
 */

import { Pressable, StyleSheet, Text } from 'react-native';

import { buttons, ChevronMark, colors, spacing } from '../theme';

export function UpgradeInvitation({
  label,
  onPress,
}: {
  /** The approved label, passed in — this file never invents product copy. */
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [buttons.ghost, styles.invite, pressed && styles.pressed]}
    >
      <Text style={[buttons.ghostText, styles.inviteText]}>{label}</Text>
      <ChevronMark size={11} color={colors.goldDeep} stroke={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  invite: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    // Row + centred, so the chevron trails the label inside the same pill.
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    // Parity with the ghost rows beneath: buttons.ghost's 14 minus the 1px
    // hairline this row adds, so the outer height matches to the pixel.
    paddingVertical: 13,
    backgroundColor: colors.goldTint,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  inviteText: {
    // Only the hue changes from a ghost CTA — size and weight stay the app's
    // secondary-CTA voice (15 / 600). 5.6:1 on goldTint, 6.2:1 on card.
    color: colors.goldDeep,
  },
  pressed: {
    opacity: 0.88,
  },
});
