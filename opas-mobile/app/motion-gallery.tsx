import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  OrbitLoader,
  RedactionSkeleton,
  DecodeScramble,
  AssemblyLoader,
  PassageButton,
  PullToGather,
  ScanLoader,
  SnagError,
  EmptyRecord,
  CountdownRing,
  StreamingText,
  Materialize,
} from '../src/components/motion';
import { useState } from 'react';

function Section({ n, title, dark, children }: { n: string; title: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl border p-6 mb-4"
      style={{
        backgroundColor: dark ? '#16150e' : '#f2ede2',
        borderColor: dark ? 'rgba(236,230,216,0.1)' : 'rgba(33,30,22,0.13)',
      }}
    >
      <View className="items-center justify-center" style={{ minHeight: 190 }}>
        {children}
      </View>
      <View className="border-t pt-3.5 mt-3" style={{ borderColor: dark ? 'rgba(236,230,216,0.12)' : 'rgba(33,30,22,0.12)' }}>
        <Text className="font-display text-[16px]" style={{ color: dark ? '#ece6d8' : '#211e16' }}>
          {n} · {title}
        </Text>
      </View>
    </View>
  );
}

export default function MotionGallery() {
  const router = useRouter();
  const [passage, setPassage] = useState<'idle' | 'processing' | 'done'>('idle');

  const runPassage = () => {
    setPassage('processing');
    setTimeout(() => setPassage('done'), 2000);
    setTimeout(() => setPassage('idle'), 4000);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))} hitSlop={10} className="mb-3">
          <Text className="font-body text-body-sm text-accent">‹ Back</Text>
        </Pressable>
        <Text className="font-display text-[28px] text-fg mb-1">Motion — Loaders</Text>
        <Text className="font-body text-body-sm text-muted mb-6">All 13 states · telekinetic loading & gestures</Text>

        <Section n="01" title="The Orbit"><OrbitLoader size={120} /></Section>
        <Section n="02" title="The Redaction"><RedactionSkeleton /></Section>
        <Section n="03" title="The Decode" dark><DecodeScramble /></Section>
        <Section n="04" title="The Assembly"><AssemblyLoader /></Section>
        <Section n="05" title="The Passage">
          <PassageButton state={passage} label="Filing to Vero" processingLabel="Filing to Vero" onPress={runPassage} />
        </Section>
        <Section n="06" title="The Gather · drag ↓">
          <PullToGather onRefresh={() => new Promise((r) => setTimeout(r, 1200))}>
            <View className="rounded-2xl bg-surface p-5" style={{ minHeight: 130 }}>
              <Text className="font-display text-[18px] text-fg">Your record</Text>
              <View className="h-2 w-3/4 rounded bg-surface-2 mt-4" />
              <View className="h-2 w-3/5 rounded bg-surface-2 mt-2.5" />
              <View className="h-2 w-2/3 rounded bg-surface-2 mt-2.5" />
            </View>
          </PullToGather>
        </Section>
        <Section n="09" title="The Scan" dark><ScanLoader /></Section>
        <Section n="10" title="The Snag"><SnagError /></Section>
        <Section n="11" title="The Empty Record"><EmptyRecord onPress={() => {}} /></Section>
        <Section n="12" title="The Countdown"><CountdownRing days={7} total={30} /></Section>
        <Section n="13" title="The Plain Words" dark>
          <StreamingText
            text="The tax office needs your reply by the 14th. You owe €248 — pay it or dispute it, whichever fits."
            className="text-[15px] text-fg"
          />
        </Section>
        <Section n="08" title="Home materialise">
          <View className="w-full gap-3">
            {[0, 1, 2].map((i) => (
              <Materialize key={i} index={i} className="h-14 rounded-xl bg-surface"><View /></Materialize>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
