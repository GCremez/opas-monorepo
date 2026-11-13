import * as React from 'react';
import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useThemeColors } from '../../src/store/themeStore';
import { useDocumentStore } from '../../src/store/documentStore';
import { usePremium } from '../../src/hooks/usePremium';
import { groupCases, letterDate, nextCaseDeadline, timelineOf } from '../../src/lib/cases';
import { documentName, formatDate } from '../../src/lib/decodeView';

/**
 * One case as a timeline (launch plan P1-7): every letter the sender wrote about this
 * matter and every deadline they set, oldest first, with a countdown to the next open
 * deadline. Styled like the application tracker (design 8d).
 */
export default function CaseScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { t, i18n } = useTranslation();
  const { key } = useLocalSearchParams<{ key: string }>();
  const documents = useDocumentStore((s) => s.documents);
  const { canSeeCases } = usePremium();

  const kase = useMemo(() => groupCases(documents).find((g) => g.key === key) ?? null, [documents, key]);
  const entries = useMemo(() => (kase ? timelineOf(kase) : []), [kase]);
  const next = kase ? nextCaseDeadline(kase) : null;
  const date = (iso: string) => formatDate(iso, i18n.language);
  const left = (days: number) => (days === 0 ? t('reminders.due_today') : t('reminders.days_left', { count: days }));

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center px-6 pt-2 pb-1">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon size={22} color={c['fg-soft']} />
        </Pressable>
      </View>

      {!canSeeCases || !kase ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-serif text-prose text-fg-soft text-center">
            {!canSeeCases ? t('case.premium_only') : t('case.not_found')}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-6 pt-3 pb-5">
            <Text className="font-semibold text-label tracking-[0.16em] uppercase text-muted">
              {kase.authority} · {t('case.eyebrow')}
            </Text>
            <Text className="font-display text-[27px] leading-[30px] tracking-[-0.01em] text-fg mt-2" accessibilityRole="header">
              {documentName(kase.documents[kase.documents.length - 1])}
            </Text>
            <Text className="font-mono text-meta tracking-[0.05em] uppercase text-muted mt-2.5">
              {t('case.meta', { reference: kase.reference, count: kase.documents.length, date: date(letterDate(kase.documents[0])) })}
            </Text>
          </View>

          {next && (
            <View className="mx-6 mb-5 p-5 bg-surface rounded-lg">
              <Text className="font-semibold text-label tracking-[0.11em] uppercase text-muted">{t('case.next')}</Text>
              <Text className={`font-display text-[22px] mt-1.5 ${next.days <= 3 ? 'text-danger' : 'text-fg'}`}>{left(next.days)}</Text>
              <Text className="font-serif text-prose text-fg-soft mt-1">
                {next.deadline.description || documentName(next.document)} · {date(next.deadline.date)}
              </Text>
            </View>
          )}

          <View className="mx-6 p-5 bg-surface rounded-lg">
            {entries.map((e, i) => {
              const isLast = i === entries.length - 1;
              const isLetter = e.kind === 'letter';
              const missed = !isLetter && !e.done && e.item.days < 0;
              const upcoming = !isLetter && !e.done && e.item.days >= 0;
              const dot = isLetter || (!isLetter && e.done) ? c.accent : missed ? c.danger : 'transparent';
              const label = isLetter ? documentName(e.document) : e.item.deadline.description || t('case.deadline');
              const meta = isLetter
                ? `${date(e.date)} · ${t('case.letter')}`
                : `${date(e.date)} · ${e.done ? t('case.done') : missed ? t('case.missed') : left(e.item.days)}`;
              const target = isLetter ? e.document.id : e.item.document.id;
              return (
                <Pressable
                  key={`${e.kind}-${target}-${e.date}-${i}`}
                  onPress={() => router.push(`/document/${target}`)}
                  className="flex-row gap-3.5"
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${meta}`}
                >
                  <View className="items-center" style={{ width: 20 }}>
                    <View
                      className="rounded-full items-center justify-center"
                      style={{ width: 20, height: 20, backgroundColor: dot, borderWidth: upcoming ? 2 : 0, borderColor: c.rule }}
                    >
                      {(isLetter || e.done) && <Text className="text-on-accent text-meta font-semibold">{isLetter ? '✉' : '✓'}</Text>}
                    </View>
                    {!isLast && <View className="flex-1 w-0.5 my-1" style={{ backgroundColor: c.hairline }} />}
                  </View>
                  <View className="flex-1 pb-6">
                    <Text className={`font-display text-[16px] ${upcoming ? 'text-fg-soft' : 'text-fg'}`}>{label}</Text>
                    <Text className={`font-mono text-meta tracking-[0.04em] mt-1 ${missed ? 'text-danger' : upcoming && e.item.days <= 3 ? 'text-warning' : 'text-muted'}`}>
                      {meta}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text className="font-serif-italic text-[14px] text-muted px-6 mt-4">{t('case.how')}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
