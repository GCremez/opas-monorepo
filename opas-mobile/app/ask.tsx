import * as React from 'react';
import { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon } from '../src/components/icons';
import { useThemeColors } from '../src/store/themeStore';

// Ask Opas — grounded Q&A (design 8a). Demo: canned grounded answers with a
// citation chip back to the source document. Wire to a RAG endpoint later.
type Msg = { role: 'user' | 'opas'; text: string; source?: string };

const CANNED: Record<string, { text: string; source: string }> = {
  default: {
    text: "With your current residence permit you can apply for a permit for your spouse on the basis of family ties. You'll need your marriage certificate and proof you can support them.",
    source: 'From your Residence Permit · Migri',
  },
};

const SUGGESTIONS = ['How do I renew it?', 'What will it cost?', 'Can my spouse move here with me?'];

export default function AskOpasScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const answer = CANNED.default;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: q },
      { role: 'opas', text: answer.text, source: answer.source },
    ]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Nav */}
        <View className="flex-row items-center justify-between px-6 pt-2 pb-1">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </Pressable>
          <Text className="font-semibold text-label tracking-[0.16em] uppercase text-muted">Ask Opas</Text>
          <View className="w-6" />
        </View>

        <ScrollView ref={scrollRef} className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {messages.length === 0 && (
            <View className="flex-1 items-center justify-center px-2">
              <Text className="font-display text-[27px] leading-[31px] tracking-[-0.01em] text-fg text-center mb-3">
                Ask Opas anything
              </Text>
              <Text className="font-serif-italic text-[15px] leading-[23px] text-muted text-center max-w-[300px]">
                Ask anything about your documents — or life in Finland.
              </Text>
            </View>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <View key={i} className="items-end mb-5">
                <View className="bg-accent rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]">
                  <Text className="font-body text-[15px] text-on-accent">{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={i} className="mb-5">
                <Text className="font-semibold text-label tracking-[0.16em] uppercase text-accent mb-2">Opas</Text>
                <Text className="font-serif text-[16px] leading-[26px] text-fg">{m.text}</Text>
                {m.source && (
                  <View className="flex-row items-center gap-2 self-start mt-3 bg-surface rounded-pill px-3 py-1.5">
                    <Text className="font-mono text-meta text-accent">◆</Text>
                    <Text className="font-mono text-meta tracking-[0.04em] text-fg-soft">{m.source}</Text>
                  </View>
                )}
              </View>
            ),
          )}
        </ScrollView>

        {/* Suggestions */}
        <View className="flex-row flex-wrap gap-2 px-5 pb-2">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => send(s)} className="border border-rule rounded-pill px-3 py-1.5">
              <Text className="font-serif-italic text-[12px] text-fg-soft">{s}</Text>
            </Pressable>
          ))}
        </View>

        {/* Input */}
        <View className="px-5 pb-6 pt-2">
          <View className="flex-row items-center gap-2.5 bg-surface rounded-pill pl-5 pr-1.5 py-1.5">
            <TextInput
              className="flex-1 font-body text-[15px] text-fg py-1.5"
              placeholder="Ask about your documents…"
              placeholderTextColor={c.muted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => send(input)}
              className="w-10 h-10 rounded-pill bg-accent items-center justify-center"
              accessibilityLabel="Send"
            >
              <Text className="text-on-accent text-[18px]">↑</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
