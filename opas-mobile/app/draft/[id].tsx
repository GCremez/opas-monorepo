import * as React from 'react';
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../../src/components/ui/Button';
import { Spinner } from '../../src/components/ui/Loading';
import { ChevronLeftIcon } from '../../src/components/icons';
import { generateDraftLetter } from '../../src/api/draftLetters';
import { usePremium } from '../../src/hooks/usePremium';
import { useThemeColors } from '../../src/store/themeStore';

export default function DraftLetterScreen() {
  const { id } = useLocalSearchParams<{ id: string; filename?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const c = useThemeColors();
  const { isPremium } = usePremium();

  const [tone, setTone] = useState<'formal' | 'professional'>('formal');
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const result = await generateDraftLetter(id, { tone, includeOriginal });
      setDraft(result.content);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!draft) return;
    await Share.share({ message: draft });
  };

  const handleCopy = async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Header = ({ title }: { title: string }) => (
    <View className="flex-row items-center px-6 pt-2 pb-1">
      <TouchableOpacity onPress={() => router.back()} hitSlop={8} accessibilityLabel={t('common.back')}>
        <ChevronLeftIcon size={22} color={c['fg-soft']} />
      </TouchableOpacity>
      <Text className="font-semibold text-[9.5px] tracking-[0.16em] uppercase text-muted flex-1 text-center" numberOfLines={1}>
        {title}
      </Text>
      <View className="w-6" />
    </View>
  );

  if (!isPremium) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <Header title={t('draftLetter.title')} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-display text-title text-fg text-center mb-2">{t('profile.upgrade_title')}</Text>
          <Text className="font-serif text-prose text-fg-soft text-center mb-8">{t('profile.upgrade_desc')}</Text>
          <Button onPress={() => router.push('/subscription')}>{t('profile.view_plans')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Header title={t('draftLetter.title')} />

      <View className="px-6 pt-2 pb-3">
        <Text className="font-display text-[26px] leading-[30px] tracking-[-0.01em] text-fg">{t('draftLetter.title')}</Text>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {!draft && !loading && (
          <View className="pt-2">
            <Text className="font-semibold text-label uppercase text-fg pb-2.5 mb-4 border-b border-rule">{t('draftLetter.tone_formal')}</Text>
            <View className="flex-row gap-2 mb-6">
              {(['formal', 'professional'] as const).map((tn) => {
                const active = tone === tn;
                return (
                  <Pressable
                    key={tn}
                    onPress={() => setTone(tn)}
                    className={`flex-1 rounded-md border py-3 items-center ${active ? 'bg-accent border-accent' : 'border-rule'}`}
                  >
                    <Text className={`font-semibold text-[11px] tracking-[0.06em] uppercase ${active ? 'text-on-accent' : 'text-fg-soft'}`}>
                      {t(`draftLetter.tone_${tn}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => setIncludeOriginal(!includeOriginal)} className="flex-row items-center gap-3 py-3">
              <View className={`w-5 h-5 rounded-sm border items-center justify-center ${includeOriginal ? 'bg-accent border-accent' : 'border-rule'}`}>
                {includeOriginal && <Text className="text-on-accent text-[11px] font-semibold">✓</Text>}
              </View>
              <Text className="font-body text-body text-fg">{t('draftLetter.include_details')}</Text>
            </TouchableOpacity>

            <Button block onPress={handleGenerate} className="mt-6">{t('draftLetter.title')}</Button>
          </View>
        )}

        {loading && (
          <View className="items-center pt-12"><Spinner size="lg" label={t('draftLetter.generating')} /></View>
        )}

        {error && !loading && (
          <View className="items-center pt-12">
            <Text className="font-serif text-prose text-danger text-center mb-4">{t('draftLetter.error')}</Text>
            <Button variant="outline" onPress={handleGenerate}>{t('common.retry')}</Button>
          </View>
        )}

        {draft && !loading && (
          <View className="pt-4">
            <View className="bg-surface rounded-md p-4 mb-5">
              <Text className="font-serif text-prose text-fg">{draft}</Text>
            </View>
            <View className="flex-row gap-3">
              <Button variant="outline" block onPress={handleCopy}>
                {copied ? t('draftLetter.copied') : t('draftLetter.copy')}
              </Button>
              <Button variant="primary" block onPress={handleShare}>{t('draftLetter.share')}</Button>
            </View>
            <Button variant="ghost" onPress={() => setDraft(null)} className="mt-4">{t('common.back')}</Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
