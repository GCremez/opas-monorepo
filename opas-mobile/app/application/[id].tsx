import * as React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useThemeColors } from '../../src/store/themeStore';

// Application tracker (design 8d). Demo status timeline; wire to Migri/Kela
// application status by :id later.
const APP = {
  authority: 'Migri · Application',
  title: 'Residence permit extension',
  meta: 'REF · 12345/2026 · SUBMITTED 18 JUN',
  stages: [
    { label: 'Submitted', meta: '18 JUN 2026', state: 'done' as const },
    { label: 'In review', meta: 'CURRENT · MIGRI IS PROCESSING', state: 'current' as const },
    { label: 'Decision', meta: 'ESTIMATED BY 12 AUG', state: 'future' as const },
  ],
  url: 'https://enterfinland.fi',
};

export default function ApplicationScreen() {
  const router = useRouter();
  const c = useThemeColors();
  useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center px-6 pt-2 pb-1">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeftIcon size={22} color={c['fg-soft']} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-6 pt-3 pb-5">
          <Text className="font-semibold text-[10px] tracking-[0.16em] uppercase text-muted">{APP.authority}</Text>
          <Text className="font-display text-[27px] leading-[30px] tracking-[-0.01em] text-fg mt-2">{APP.title}</Text>
          <Text className="font-mono text-[10px] tracking-[0.05em] text-muted mt-2.5">{APP.meta}</Text>
        </View>

        {/* Status timeline */}
        <View className="mx-6 mb-6 p-5 bg-surface rounded-lg">
          {APP.stages.map((s, i) => {
            const isLast = i === APP.stages.length - 1;
            const dot =
              s.state === 'done' ? c.accent : s.state === 'current' ? c.warning : 'transparent';
            const metaTone = s.state === 'current' ? 'text-warning' : 'text-muted';
            return (
              <View key={s.label} className="flex-row gap-3.5">
                <View className="items-center" style={{ width: 20 }}>
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 20, height: 20, backgroundColor: dot,
                      borderWidth: s.state === 'future' ? 2 : 0, borderColor: c.rule,
                    }}
                  >
                    {s.state === 'done' && <Text className="text-on-accent text-[10px] font-semibold">✓</Text>}
                  </View>
                  {!isLast && <View className="flex-1 w-0.5 my-1" style={{ backgroundColor: c.hairline }} />}
                </View>
                <View className="flex-1 pb-6">
                  <Text className={`font-display text-[16px] ${s.state === 'future' ? 'text-fg-soft' : 'text-fg'}`}>{s.label}</Text>
                  <Text className={`font-mono text-[10px] tracking-[0.04em] mt-1 ${metaTone}`}>{s.meta}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View className="px-6">
          <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">What happens next</Text>
          <Text className="font-serif text-prose text-fg-soft mt-3">
            Migri is reviewing your application. You don't need to do anything — Opas will alert you the moment the decision arrives.
          </Text>
        </View>

        <View className="px-6 pt-6">
          <Pressable
            onPress={() => Linking.openURL(APP.url)}
            className="items-center rounded-pill border border-rule py-3.5"
          >
            <Text className="font-semibold text-[12px] tracking-[0.04em] text-fg">Check on Migri ↗</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
