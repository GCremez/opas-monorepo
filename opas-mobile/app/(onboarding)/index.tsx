import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { View, Text, Dimensions, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { useThemeColors } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

// Slide 1: a Kela letter as Opas reads it. The Finnish original with the name
// blacked out (personal details are hidden first), then what it means in plain words.
function LetterPreview() {
  const { t } = useTranslation();
  return (
    <View className="rounded-lg bg-surface p-4 mb-8" accessible accessibilityLabel={t('onboarding.illo_plain')}>
      <Text className="font-mono text-meta uppercase text-muted">Kela · Päätös</Text>
      <View className="flex-row items-center gap-2 mt-3">
        <View className="h-2.5 w-24 rounded-sm bg-fg" />
        <View className="h-1.5 w-14 rounded-sm bg-node" />
      </View>
      <Text className="font-serif text-[14px] text-fg-soft mt-2.5">Päätös yleisestä asumistuesta</Text>
      <View className="h-1.5 w-[85%] rounded-sm bg-node mt-2.5" />
      <View className="h-1.5 w-[60%] rounded-sm bg-node mt-1.5" />

      <View className="border-t border-rule mt-4 pt-3">
        <Text className="font-semibold text-label uppercase text-accent">{t('onboarding.illo_meaning')}</Text>
        <Text className="font-serif text-[16px] leading-[22px] text-fg mt-1.5">{t('onboarding.illo_plain')}</Text>
        <Text className="font-mono text-meta uppercase text-warning mt-2">→ {t('onboarding.illo_action')}</Text>
      </View>
    </View>
  );
}

function MiniLedger({ rows }: { rows: { label: string; value: string; tone: string }[] }) {
  return (
    <View className="rounded-lg bg-surface p-4 mb-8">
      {rows.map((r, i) => (
        <View key={r.label} className={`flex-row items-center justify-between py-2.5${i < rows.length - 1 ? ' border-b border-line' : ''}`}>
          <Text className="font-serif text-[14px] text-fg">{r.label}</Text>
          <Text className={`font-mono text-label tracking-[0.05em] uppercase ${r.tone}`}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const slides = [
    {
      key: 'scan',
      eyebrow: t('onboarding.eyebrow_1'),
      title: t('onboarding.slide_1_title'),
      desc: t('onboarding.slide_1_desc'),
      illo: <LetterPreview />,
    },
    {
      key: 'dates',
      eyebrow: t('onboarding.eyebrow_2'),
      title: t('onboarding.slide_2_title'),
      desc: t('onboarding.slide_2_desc'),
      illo: (
        <MiniLedger
          rows={[
            { label: t('onboarding.mini_1_row_1_label'), value: t('onboarding.mini_1_row_1_value'), tone: 'text-danger' },
            { label: t('onboarding.mini_1_row_2_label'), value: t('onboarding.mini_1_row_2_value'), tone: 'text-warning' },
          ]}
        />
      ),
    },
    {
      key: 'organize',
      eyebrow: t('onboarding.eyebrow_3'),
      title: t('onboarding.slide_3_title'),
      desc: t('onboarding.slide_3_desc'),
      illo: (
        <MiniLedger
          rows={[
            { label: t('onboarding.mini_2_row_1_label'), value: t('onboarding.mini_2_row_1_value'), tone: 'text-muted' },
            { label: t('onboarding.mini_2_row_2_label'), value: t('onboarding.mini_2_row_2_value'), tone: 'text-muted' },
            { label: t('onboarding.mini_2_row_3_label'), value: t('onboarding.mini_2_row_3_value'), tone: 'text-warning' },
          ]}
        />
      ),
    },
  ];

  const isLast = index === slides.length - 1;

  // The app opens here on every launch, so this screen decides where people belong:
  // a signed-in user goes straight to their record, and someone who has already been
  // through onboarding goes to sign in. Only first-time visitors see the slides.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [routeChecked, setRouteChecked] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
      return;
    }
    SecureStore.getItemAsync('has_seen_onboarding')
      .then((seen) => {
        if (seen === 'true') router.replace('/(auth)/welcome');
        else setRouteChecked(true);
      })
      .catch(() => setRouteChecked(true));
  }, [isAuthenticated, router]);

  const complete = async () => {
    await SecureStore.setItemAsync('has_seen_onboarding', 'true');
    router.replace('/(auth)/welcome');
  };

  const next = () => {
    if (isLast) complete();
    else flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onViewable = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  if (!routeChecked) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Fixed header: step counter + skip */}
      <View className="flex-row items-center justify-between px-6 pt-2.5">
        <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">
          {t('onboarding.step', { n: index + 1 })}
        </Text>
        {!isLast && (
          <Pressable onPress={complete} hitSlop={8}>
            <Text className="font-semibold text-label tracking-[0.13em] uppercase text-muted">{t('onboarding.skip')}</Text>
          </Pressable>
        )}
      </View>

      {/* Swipeable slides — left-aligned, vertically centered */}
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(s) => s.key}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 justify-center px-[30px]">
            {/* Fixed-height stage so the heading sits at the same height on every slide. */}
            <View className="h-[250px] justify-end">{item.illo}</View>
            <Text className="font-semibold text-label tracking-[0.18em] uppercase text-accent mb-3.5">{item.eyebrow}</Text>
            <Text className="font-display text-[34px] leading-[37px] tracking-[-0.01em] text-fg">{item.title}</Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mt-4">{item.desc}</Text>
          </View>
        )}
      />

      {/* Fixed footer: dots left, Next right (or full-width Get started on last) */}
      <View className="px-[30px] pt-6 pb-8">
        {isLast ? (
          <>
            <Pressable onPress={complete} className="bg-accent rounded-pill py-4 items-center justify-center min-h-touch">
              <Text className="font-semibold text-[13px] tracking-[0.04em] text-on-accent">{t('onboarding.get_started')}</Text>
            </Pressable>
            <View className="flex-row justify-center gap-1.5 mt-5">
              {slides.map((_, i) => (
                <View key={i} className="h-1.5 rounded-pill" style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? c.accent : c.node }} />
              ))}
            </View>
          </>
        ) : (
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-1.5">
              {slides.map((_, i) => (
                <View key={i} className="h-1.5 rounded-pill" style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? c.accent : c.node }} />
              ))}
            </View>
            <Pressable onPress={next} className="bg-accent rounded-pill px-6 py-3 min-h-touch items-center justify-center">
              <Text className="font-semibold text-label tracking-[0.08em] uppercase text-on-accent">{t('onboarding.next')} →</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
