import * as React from 'react';
import { View, Text, Modal, TouchableWithoutFeedback } from 'react-native';
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <View
              className="bg-surface rounded-t-[20px] pt-4 pb-8 px-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.55,
                shadowRadius: 24,
                elevation: 16,
              }}
            >
              <View className="w-8 h-1 rounded-full bg-surface-3 mx-auto mb-4" />
              <Text className="text-heading-m text-fg mb-2">{title}</Text>
              <Text className="text-body-sm text-muted mb-6 leading-[1.6]">
                {message}
              </Text>
              <View className="flex-col gap-2">
                <Button
                  variant={destructive ? 'danger' : 'primary'}
                  block
                  onPress={onConfirm}
                >
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
