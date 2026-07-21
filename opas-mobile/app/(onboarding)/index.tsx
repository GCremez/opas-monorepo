import * as React from 'react';
import { useRef, useState } from 'react';
import { View, Text, Dimensions, Pressable, FlatList } from 'react-native';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

function ScanIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      <Rect x={10} y={15} width={100} height={90} rx={8} stroke="#92d9bb" strokeWidth={2} />
      <Line x1={30} y1={40} x2={90} y2={40} stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <Line x1={30} y1={55} x2={75} y2={55} stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <Line x1={30} y1={70} x2={85} y2={70} stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <Circle cx={95} cy={95} r={18} stroke="#92d9bb" strokeWidth={2} />
      <Path d="M89 95h12M95 89v12" stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function AiIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={45} stroke="#92d9bb" strokeWidth={2} />
      <Path d="M40 75l8-16h24l8 16" stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M48 59l4-8h16l4 8" stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
      <Circle cx={60} cy={40} r={3} fill="#92d9bb" />
      <Circle cx={75} cy={50} r={2} fill="#92d9bb" opacity={0.6} />
      <Circle cx={45} cy={50} r={2} fill="#92d9bb" opacity={0.6} />
    </Svg>
  );
}

function FolderIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      <Path d="M15 95h90a8 8 0 0 0 8-8V55a8 8 0 0 0-8-8H60L48 35H23a8 8 0 0 0-8 8v52a8 8 0 0 0 8 8Z" stroke="#92d9bb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={50} cy={70} r={5} fill="#92d9bb" opacity={0.8} />
      <Circle cx={70} cy={70} r={5} fill="#92d9bb" opacity={0.5} />
      <Rect x={62} y={66} width={16} height={8} rx={2} fill="#92d9bb" opacity={0.3} />
    </Svg>
  );
}

const slides: Slide[] = [
  { key: 'scan', icon: <ScanIllustration />, titleKey: 'onboarding.slide_1_title', descKey: 'onboarding.slide_1_desc' },
  { key: 'decode', icon: <AiIllustration />, titleKey: 'onboarding.slide_2_title', descKey: 'onboarding.slide_2_desc' },
  { key: 'organize', icon: <FolderIllustration />, titleKey: 'onboarding.slide_3_title', descKey: 'onboarding.slide_3_desc' },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      handleComplete();
    } else {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleComplete = async () => {
    await SecureStore.setItemAsync('has_seen_onboarding', 'true');
    router.replace('/(auth)/welcome');
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync('has_seen_onboarding', 'true');
    router.replace('/(auth)/welcome');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems[0]?.index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={{ width }} className="flex-1 items-center justify-center px-8">
      <View className="mb-10 opacity-90">{item.icon}</View>
      <Text className="font-display text-[26px] font-bold text-fg text-center mb-3" style={{ letterSpacing: -0.03 }}>
        {t(item.titleKey)}
      </Text>
      <Text className="text-body text-muted text-center leading-[1.7] max-w-[320px]">
        {t(item.descKey)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1">
        <View className="items-end px-5 pt-2">
          {!isLastSlide && (
            <Pressable
              onPress={handleSkip}
              className="px-4 py-2 min-h-touch justify-center"
              accessibilityLabel={t('onboarding.skip')}
            >
              <Text className="text-body-sm text-muted font-medium">{t('onboarding.skip')}</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          ref={flatRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          keyExtractor={(item) => item.key}
        />

        <View className="items-center pb-8 px-5 gap-6">
          <View className="flex-row gap-2">
            {slides.map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${i === currentIndex ? 'w-6 bg-accent' : 'w-1.5 bg-surface-3'}`}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            className="w-full max-w-sm bg-accent rounded-md py-4 items-center justify-center min-h-touch"
            accessibilityLabel={isLastSlide ? t('onboarding.get_started') : t('onboarding.next')}
          >
            <Text className="text-body font-semibold text-black">
              {isLastSlide ? t('onboarding.get_started') : t('onboarding.next')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
