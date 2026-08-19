import * as React from 'react';
import { View, Text, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback>
            <View
              className="bg-bg rounded-t-xl pt-5 px-6"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              <View className="w-9 h-1 rounded-pill bg-surface-2 mx-auto mb-5" />
              <Text className="font-display text-title text-fg mb-2">{title}</Text>
              <Text className="font-serif text-prose text-fg-soft mb-6">{message}</Text>
              <View className="flex-col gap-2">
                <Button variant={destructive ? 'danger' : 'primary'} block onPress={onConfirm}>
                  {confirmLabel}
                </Button>
                <Button variant="ghost" block onPress={onCancel}>
                  {cancelLabel ?? t('common.cancel')}
                </Button>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
