import * as React from 'react';
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useThemeColors } from '../../src/store/themeStore';

// Guides — step-by-step for common tasks (design 8b). Demo content; a real
// guide library would come from the backend keyed by :id.
type Step = { title: string; desc: string };

const GUIDE = {
  authority: 'DVV · Guide',
  title: 'Register your address',
  meta: '4 STEPS · ~15 MIN · FREE',
  intro:
    "When you move, tell the Digital and Population Data Services Agency within a week. Here's how.",
  url: 'https://dvv.fi',
  steps: [
    { title: 'Gather your details', desc: 'Your ID, new address and move date.' },
    { title: 'Fill the move notification', desc: 'Online at dvv.fi with your bank credentials.' },
    { title: 'Submit & save the receipt', desc: 'Opas can file the confirmation for you.' },
    { title: 'Update other authorities', desc: 'Kela and your employer are notified automatically.' },
  ] as Step[],
};

export default function GuideScreen() {
  const router = useRouter();
  const c = useThemeColors();
  useLocalSearchParams<{ id: string }>();
  const [done, setDone] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center px-6 pt-2 pb-1">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeftIcon size={22} color={c['fg-soft']} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-6 pt-3 pb-4">
          <Text className="font-semibold text-label tracking-[0.16em] uppercase text-muted">{GUIDE.authority}</Text>
          <Text className="font-display text-[28px] leading-[31px] tracking-[-0.01em] text-fg mt-2">{GUIDE.title}</Text>
          <Text className="font-mono text-meta tracking-[0.05em] text-muted mt-2.5">{GUIDE.meta}</Text>
        </View>

        <View className="px-6">
          <Text className="font-serif text-prose text-fg-soft">{GUIDE.intro}</Text>
        </View>

        <View className="px-6 pt-4">
          {GUIDE.steps.map((s, i) => {
            const isDone = done.has(i);
            return (
              <Pressable
                key={s.title}
                onPress={() => toggle(i)}
                className="flex-row gap-3.5 py-3.5 border-b border-line"
              >
                <View className={`w-6 h-6 rounded-full border items-center justify-center ${isDone ? 'bg-accent border-accent' : 'border-rule'}`}>
                  <Text className={`text-meta font-semibold ${isDone ? 'text-on-accent' : 'text-fg-soft'}`}>{isDone ? '✓' : i + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className={`font-display text-[16px] ${isDone ? 'text-muted line-through' : 'text-fg'}`}>{s.title}</Text>
                  <Text className="font-body text-body-sm text-fg-soft mt-0.5">{s.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="px-6 pt-6">
          <Button variant="primary" block size="lg" onPress={() => Linking.openURL(GUIDE.url)}>
            Open the DVV form ↗
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
