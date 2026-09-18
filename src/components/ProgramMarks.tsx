/**
 * Calm Quest — the program marks row (build 14, two-paths §3).
 *
 * The paywall hero's top half: the three programs at mark scale, ABOVE the five
 * theme swatches, so the offer reads "three programs, every theme in each"
 * rather than "five themes". Truthful by construction, exactly like the theme
 * swatch row it sits above:
 *  - a program the user holds is drawn as the app's kept/practice pair — a
 *    `tealTint` disc with the filled `Sprout`;
 *  - a program they do not hold is `sand` with the hollow `Leaf` and a
 *    `goldBright` hairline (the value family's "there is more here" grammar —
 *    no padlock, no dimmed text, nothing disabled-looking);
 *  - and the take-it-or-leave-it pair is real: the caller passes the same gate
 *    derivation the rest of the app uses (`programsFor`), so what is drawn is
 *    what the user actually holds. Before the persisted state has loaded the
 *    caller passes nothing, and nothing is claimed as held.
 *
 * Hooks-free and copy-free on purpose: every name arrives as a prop (the labels
 * live in PATH_LABELS), so this file invents no product copy and the proof suite
 * can invoke it and walk the tree.
 */

import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { PathId } from '../models/types';
import { colors, Leaf, spacing, Sprout } from '../theme';

export interface ProgramMarkItem {
  path: PathId;
  /** The program's real display name (PATH_LABELS[path]). */
  name: string;
  /** Whether the user HOLDS this program right now. */
  held: boolean;
}

export function ProgramMarkRow({
  items,
  size = 34,
  style,
}: {
  items: readonly ProgramMarkItem[];
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const glyph = size * 0.5;
  return (
    <View style={[styles.row, style]} accessibilityRole="summary">
      {items.map((item) => (
        <View key={item.path} style={styles.item}>
          <View
            style={[
              styles.disc,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: item.held ? colors.tealTint : colors.sand,
                borderWidth: item.held ? 0 : 1,
                borderColor: item.held ? 'transparent' : colors.goldBright,
              },
            ]}
          >
            {item.held ? (
              <Sprout size={glyph} color={colors.tealDeep} />
            ) : (
              <Leaf size={glyph} color={colors.inkSoft} rotate={-28} hollow />
            )}
          </View>
          <Text
            style={[styles.name, { color: item.held ? colors.tealDeep : colors.inkSoft }]}
            accessibilityLabel={`${item.name}, ${
              item.held ? 'yours now' : 'included with Calm Quest+'
            }`}
          >
            {item.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
