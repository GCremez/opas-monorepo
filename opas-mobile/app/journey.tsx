import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon } from '../src/components/icons';
import { useThemeColors } from '../src/store/themeStore';

// Journey — life-admin timeline (design 8c). Demo milestones; wire to the
// user's real document/application history later.
type Milestone = {
  year: string;
  title: string;
  status?: 'done' | 'current' | 'future';
  note?: string;
};

const MILESTONES: Milestone[] = [
  { year: '2024', title: 'Arrived in Finland', status: 'done' },
  { year: '2024', title: 'Registered address · tax card · Kela', status: 'done' },
  { year: 'NOW · 2026', title: 'Extending residence permit', status: 'current', note: 'In progress' },
  { year: '~2028', title: 'Permanent residence', status: 'future' },
  { year: '~2029', title: 'Citizenship eligible', status: 'future' },
];

export default function JourneyScreen() {
  const router = useRouter();
  const c = useThemeColors();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center px-6 pt-2 pb-1">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeftIcon size={22} color={c['fg-soft']} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-3 pb-7">
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">Opas · Journey</Text>
          <Text className="font-display text-[30px] leading-[32px] tracking-[-0.01em] text-fg mt-2.5">
            Your life in{'\n'}Finland, so far.
          </Text>
        </View>

        <View className="px-6">
          {MILESTONES.map((m, i) => {
            const isLast = i === MILESTONES.length - 1;
            const dotColor =
              m.status === 'current' ? c.warning : m.status === 'future' ? 'transparent' : c.accent;
            const yearTone =
              m.status === 'current' ? 'text-warning' : 'text-muted';
            const titleTone = m.status === 'future' ? 'text-fg-soft' : 'text-fg';
            return (
              <View key={i} className="flex-row gap-4">
                {/* Rail + node */}
                <View className="items-center" style={{ width: 16 }}>
                  <View
                    className="rounded-full mt-1"
                    style={{
                      width: 15,
                      height: 15,
                      backgroundColor: dotColor,
                      borderWidth: m.status === 'future' ? 2 : 0,
                      borderColor: c.rule,
                    }}
                  />
                  {!isLast && <View className="flex-1 w-px my-1" style={{ backgroundColor: c.hairline }} />}
                </View>
                {/* Content */}
                <View className="flex-1 pb-6">
                  <Text className={`font-mono-medium text-[13px] ${yearTone}`}>{m.year}</Text>
                  <Text className={`font-serif text-[16px] leading-[22px] mt-1 ${titleTone}`}>{m.title}</Text>
                  {m.note && (
                    <Text className="font-semibold text-label tracking-[0.11em] uppercase text-warning mt-1">{m.note}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
