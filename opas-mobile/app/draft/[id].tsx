import * as React from 'react';
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { Button } from '../../src/components/ui/Button';
import { Spinner } from '../../src/components/ui/Loading';
import { generateDraftLetter } from '../../src/api/draftLetters';
import { usePremium } from '../../src/hooks/usePremium';

function ChevronLeftIcon({ size = 24, color = '#8e8e93' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18 9 12l6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function DraftLetterScreen() {
  const { id, filename } = useLocalSearchParams<{ id: string; filename?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
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

  if (!isPremium) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-row items-center px-5 pt-3 pb-2">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeftIcon />
          </TouchableOpacity>
          <Text className="font-display text-[17px] font-semibold text-fg flex-1 text-center">
            {t('draftLetter.title')}
          </Text>
          <View className="w-6" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[48px] mb-4">🔒</Text>
          <Text className="font-display text-[20px] font-semibold text-fg text-center mb-2">
            {t('profile.upgrade_title')}
          </Text>
          <Text className="text-body text-muted text-center mb-6">
            {t('profile.upgrade_desc')}
          </Text>
          <Button onPress={() => router.push('/subscription')}>
            {t('profile.view_plans')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center px-5 pt-3 pb-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeftIcon />
        </TouchableOpacity>
        <Text className="font-display text-[17px] font-semibold text-fg flex-1 text-center" numberOfLines={1}>
          {t('draftLetter.title')}
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {!draft && !loading && (
          <View className="pt-6">
            <Text className="text-[13px] text-muted mb-2">{t('draftLetter.generating')}</Text>

            <Text className="text-[12px] font-semibold text-fg uppercase tracking-wide mb-2 mt-4">
              {t('draftLetter.tone_formal')}
            </Text>
            <View className="flex-row gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setTone('formal')}
                className={`flex-1 py-3 rounded-lg items-center border ${tone === 'formal' ? 'bg-accent border-accent' : 'bg-surface border-border'}`}
              >
                <Text className={`text-[13px] font-semibold ${tone === 'formal' ? 'text-black' : 'text-muted'}`}>
                  {t('draftLetter.tone_formal')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTone('professional')}
                className={`flex-1 py-3 rounded-lg items-center border ${tone === 'professional' ? 'bg-accent border-accent' : 'bg-surface border-border'}`}
              >
                <Text className={`text-[13px] font-semibold ${tone === 'professional' ? 'text-black' : 'text-muted'}`}>
                  {t('draftLetter.tone_professional')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIncludeOriginal(!includeOriginal)}
              className="flex-row items-center gap-3 py-3"
            >
              <View className={`w-5 h-5 rounded-[4px] border-2 items-center justify-center ${includeOriginal ? 'bg-accent border-accent' : 'border-border'}`}>
                {includeOriginal && (
                  <Svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6 9 17l-5-5" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </View>
              <Text className="text-[14px] text-fg">{t('draftLetter.include_details')}</Text>
            </TouchableOpacity>

            <Button block onPress={handleGenerate} className="mt-6">
              {t('draftLetter.title')}
            </Button>
          </View>
        )}

        {loading && (
          <View className="items-center pt-12">
            <Spinner size="lg" label={t('draftLetter.generating')} />
          </View>
        )}

        {error && !loading && (
          <View className="items-center pt-12">
            <Text className="text-body text-danger text-center mb-4">{t('draftLetter.error')}</Text>
            <Button variant="outline" onPress={handleGenerate}>{t('common.retry')}</Button>
          </View>
        )}

        {draft && !loading && (
          <View className="pt-6">
            <View className="bg-surface border border-border rounded-xl p-4 mb-4">
              <Text className="text-[14px] text-fg leading-[1.8] font-mono whitespace-pre-wrap">
                {draft}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCopy}
                className="flex-1 flex-row items-center justify-center gap-2 bg-surface border border-border rounded-lg py-3"
              >
                <Text className="text-[13px] font-semibold text-fg">
                  {copied ? t('draftLetter.copied') : t('draftLetter.copy')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                className="flex-1 flex-row items-center justify-center gap-2 bg-accent rounded-lg py-3"
              >
                <Text className="text-[13px] font-semibold text-black">{t('draftLetter.share')}</Text>
              </TouchableOpacity>
            </View>

            <Button variant="ghost" onPress={() => { setDraft(null); }} className="mt-4">
              {t('common.back')}
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
