/**
 * Calm Quest — in-app Privacy & Terms (Phase 5, feature spec §3 F9;
 * App Store requirement).
 *
 * Mirrors the marketing site's legal pages verbatim (`/home/team/shared/site/
 * src/routes/privacy.tsx` + `terms.tsx`) so the app and site never disagree,
 * rendered as an in-app scroll view (no WebView dependency — the copy is
 * static and small). One screen, two documents, selected by route param:
 *   Privacy: what the app/site collects, uses, and never does.
 *   Terms:   plain-language terms of use (incl. "not medical advice").
 *
 * Do NOT invent new legal text here — when the site pages change, mirror the
 * change here in the same session.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppRouteParamList } from '../navigation/types';
import { colors, page, radii, spacing } from '../theme';

export type LegalDoc = 'privacy' | 'terms';

/** Block = { heading?, paragraphs: string[] }. Text matches the site pages. */
interface LegalBlock {
  heading?: string;
  paragraphs: string[];
}

const PRIVACY_DOC: readonly LegalBlock[] = [
  {
    paragraphs: [
      'This page explains what the Calm Quest website collects and what it does with it, in plain language. The Calm Quest app is still in development — this site is currently a preview and early-interest page.',
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: [
      "The only personal information this site collects is the email address you type into the early-list form. That's it. We don't ask for your name, and we don't collect anything else about you.",
    ],
  },
  {
    heading: 'What we use it for',
    paragraphs: [
      'Your email address is used for one thing: to notify you when Calm Quest launches. We will not use it for anything else without asking you first.',
    ],
  },
  {
    heading: 'What we never do',
    paragraphs: [
      "We never sell, rent, or share your email address with anyone. There are no advertising partners, data brokers, or third-party marketers on the receiving end — there is nobody to sell it to.",
    ],
  },
  {
    heading: 'Tracking and analytics',
    paragraphs: [
      "This site uses no analytics, no advertising trackers, and no cookies for tracking. We can't build a profile of you, because we aren't collecting the data to build one with.",
    ],
  },
  {
    heading: 'Removing your email',
    paragraphs: [
      "You can have your email address removed at any time. Just reach out through the site and ask — we'll delete it, no questions asked and no hoops to jump through.",
    ],
  },
  {
    heading: 'In the app',
    paragraphs: [
      'The app keeps your practice data (quests, affirmations, glimpses, streak, progress) on your own device, and the Settings screen lets you delete all of it at any time. Server-side data deletion arrives with the real backend; until then, everything the app stores is local and fully deletable.',
    ],
  },
  {
    heading: 'Questions',
    paragraphs: [
      "If anything here is unclear or you'd like to know more, contact us through the site. A real person reads every message.",
    ],
  },
];

const TERMS_DOC: readonly LegalBlock[] = [
  {
    paragraphs: [
      'These are the plain-language terms for using the Calm Quest website. By using the site, you agree to them. We\u2019ve kept them short and readable on purpose.',
    ],
  },
  {
    heading: 'What this site is',
    paragraphs: [
      "Calm Quest is an app in development: mindset training and self-care through play — daily challenges, affirmations, and calming mini games. Right now this website describes that future app and lets people join an early-interest list. The app itself is not available yet.",
    ],
  },
  {
    heading: 'Not medical advice',
    paragraphs: [
      "Nothing on this site — or in the app when it launches — is medical, psychological, or therapeutic advice. Calm Quest is a self-care tool, not a treatment, and it is no substitute for professional care. If you are struggling with your mental health, please talk to a qualified professional. If you are in crisis, contact your local emergency services or a crisis line right away.",
    ],
  },
  {
    heading: 'No guarantees of results',
    paragraphs: [
      "We can't promise specific outcomes from using Calm Quest. People's experiences with mindset and self-care practices differ, and any examples of progress or improvement are illustrations, not promises.",
    ],
  },
  {
    heading: 'Pricing is illustrative',
    paragraphs: [
      "The prices shown on this site are sample prices to give a sense of what the app may eventually cost. Billing is not active — there is nothing to purchase on this site today, and no payment information is collected. Subscription and paid features are not yet active, and the final pricing may differ from what's shown.",
    ],
  },
  {
    heading: 'Your use of the app',
    paragraphs: [
      "Please use the app as it's meant to be used: a gentle daily practice on your own device. Don't attempt to disrupt, overload, or misuse the app or the systems behind it.",
    ],
  },
  {
    heading: 'In-app purchases',
    paragraphs: [
      'If and when in-app purchases go live, they are billed through the App Store and governed by Apple\u2019s standard terms. The daily loop — today\u2019s quest, Affirmation of the Day, one Glimpse a day, grace streaks, and levels 1–5 — stays free, always.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      "As the app takes shape, these terms may be updated to reflect what the product actually is. When the real app and real billing arrive, we'll present the real terms before you sign up for anything.",
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions about these terms? Reach out through the site — we read every message.',
    ],
  },
];

export default function PrivacyTermsScreen({
  route,
}: {
  route: { params: { doc: LegalDoc } };
}) {
  const navigation = useNavigation<NativeStackNavigationProp<AppRouteParamList, 'PrivacyTerms'>>();
  const doc = route.params.doc;
  const blocks = doc === 'privacy' ? PRIVACY_DOC : TERMS_DOC;
  return (
    <ScrollView style={page.screen} contentContainerStyle={[page.content, styles.container]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to settings"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{doc === 'privacy' ? 'Privacy' : 'Terms of Use'}</Text>
        <View style={styles.backBtn} />
      </View>
      {blocks.map((b, i) => (
        <View key={i} style={styles.block}>
          {b.heading ? <Text style={styles.heading}>{b.heading}</Text> : null}
          {b.paragraphs.map((p, j) => (
            <Text key={j} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}
      <Text style={styles.footnote}>
        This in-app page mirrors the copy on questcalm.com — same words, one
        place to read them.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    minWidth: 72,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.tealDeep,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  block: {
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  footnote: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});