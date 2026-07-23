import * as React from 'react';
import { useRef, useState } from 'react';
import { View, Text, Dimensions, Pressable, FlatList } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { useThemeColors } from '../../src/store/themeStore';

const { width } = Dimensions.get('window');

// Diagonal "paper" striping for the slide-1 illustration panel (design 2d).
function StripePanel({ caption, color, line }: { caption: string; color: string; line: string }) {
  const W = 320, H = 170, gap = 18;
  const lines = [];
  for (let x = -H; x < W; x += gap) {
    lines.push(<Line key={x} x1={x} y1={H} x2={x + H} y2={0} stroke={line} strokeWidth={7} />);
  }
  return (
    <View className="h-[170px] rounded-lg bg-surface overflow-hidden items-center justify-center mb-8">
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute' }}>
        {lines}
      </Svg>
      <Text className="font-mono text-[10px] tracking-[0.08em]" style={{ color }}>[ {caption} ]</Text>
    </View>
  );
}

function MiniLedger({ rows }: { rows: { label: string; value: string; tone: string }[] }) {
  return (
    <View className="rounded-lg bg-surface p-4 mb-8">
      {rows.map((r, i) => (
        <View key={r.label} className={`flex-row items-center justify-between py-2.5${i < rows.length - 1 ? ' border-b border-hairline' : ''}`}>
          <Text className="font-serif text-[14px] text-fg">{r.label}</Text>
          <Text className={`font-mono text-[10px] tracking-[0.05em] uppercase ${r.tone}`}>{r.value}</Text>
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
      illo: <StripePanel caption={t('onboarding.illo_caption')} color={c.muted} line={c['surface-2']} />,
    },
    {
      key: 'dates',
      eyebrow: t('onboarding.eyebrow_2'),
      title: t('onboarding.slide_2_title'),
      desc: t('onboarding.slide_2_desc'),
      illo: (
        <MiniLedger
          rows={[
            { label: 'Report income change', value: '9 days', tone: 'text-danger' },
            { label: 'Extend permit', value: '3 weeks', tone: 'text-warning' },
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
            { label: 'KELA', value: '5 docs', tone: 'text-muted' },
            { label: 'Verohallinto', value: '3 docs', tone: 'text-muted' },
            { label: 'Migri', value: '2 · 1 due', tone: 'text-warning' },
          ]}
        />
      ),
    },
  ];

  const isLast = index === slides.length - 1;

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

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Fixed header: step counter + skip */}
      <View className="flex-row items-center justify-between px-6 pt-2.5">
        <Text className="font-semibold text-[10.5px] tracking-[0.20em] uppercase text-muted">
          {t('onboarding.step', { n: index + 1 })}
        </Text>
        {!isLast && (
          <Pressable onPress={complete} hitSlop={8}>
            <Text className="font-semibold text-[10px] tracking-[0.13em] uppercase text-muted">{t('onboarding.skip')}</Text>
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
            {item.illo}
            <Text className="font-semibold text-[10px] tracking-[0.18em] uppercase text-accent mb-3.5">{item.eyebrow}</Text>
            <Text className="font-display text-[34px] leading-[37px] tracking-[-0.01em] text-fg">{item.title}</Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mt-4">{item.desc}</Text>
          </View>
        )}
      />

      {/* Fixed footer: dots left, Next right (or full-width Get started on last) */}
      <View className="px-[30px] pt-6 pb-8">
        {isLast ? (
          <>
            <View className="flex-row gap-1.5 mb-5">
              {slides.map((_, i) => (
                <View key={i} className="h-1.5 rounded-pill" style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? c.accent : c.node }} />
              ))}
            </View>
            <Pressable onPress={complete} className="bg-accent rounded-pill py-4 items-center justify-center min-h-touch">
              <Text className="font-semibold text-[13px] tracking-[0.04em] text-on-accent">{t('onboarding.get_started')}</Text>
            </Pressable>
          </>
        ) : (
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-1.5">
              {slides.map((_, i) => (
                <View key={i} className="h-1.5 rounded-pill" style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? c.accent : c.node }} />
              ))}
            </View>
            <Pressable onPress={next} className="bg-accent rounded-pill px-6 py-3 min-h-touch items-center justify-center">
              <Text className="font-semibold text-[11px] tracking-[0.08em] uppercase text-on-accent">{t('onboarding.next')} →</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
