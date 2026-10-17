import * as React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LogoMark } from './icons';
import { Button } from './ui/Button';
import { useReminderStore } from '../store/reminderStore';
import { track } from '../lib/analytics';

/**
 * Design 5e: asks for notifications in context — over Home, once there is a deadline
 * worth reminding about — instead of a cold system prompt at sign-in.
 */
export function RemindersPrompt({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setEnabled, dismissPrompt } = useReminderStore();

  const notNow = () => {
    track('reminders_prompt_dismissed');
    dismissPrompt();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={notNow}>
      <Pressable className="flex-1" style={{ backgroundColor: 'rgba(20,18,10,0.32)' }} onPress={notNow} accessibilityLabel={t('reminders.not_now')} />
      <View className="bg-bg rounded-t-[22px] px-[30px] pt-[30px] items-center" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="mb-4"><LogoMark size={50} /></View>
        <Text className="font-display text-[23px] leading-[28px] text-fg text-center" accessibilityRole="header">
          {t('reminders.prompt_title')}
        </Text>
        <Text className="font-serif text-[15px] leading-[23px] text-muted text-center max-w-[300px] mt-2.5 mb-6">
          {t('reminders.prompt_desc')}
        </Text>
        <Button variant="primary" block onPress={async () => { await setEnabled(true); await dismissPrompt(); }}>
          {t('reminders.turn_on')}
        </Button>
        <TouchableOpacity onPress={notNow} className="py-3.5 mt-1 min-h-touch justify-center">
          <Text className="font-semibold text-label uppercase text-fg-soft">{t('reminders.not_now')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
