import * as React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

interface BottomSheetAction {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  title?: string;
  actions: BottomSheetAction[];
  onClose: () => void;
}

export function BottomSheet({ visible, title, actions, onClose }: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
              {title && (
                <Text className="text-heading-m text-fg mb-4">{title}</Text>
              )}
              {actions.map((action, i) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  className="flex-row items-center gap-3 py-3 min-h-touch"
                >
                  {action.icon && (
                    <View className="w-7 h-7 rounded-sm items-center justify-center flex-shrink-0">
                      {action.icon}
                    </View>
                  )}
                  <Text
                    className={`flex-1 text-body ${
                      action.destructive ? 'text-danger' : 'text-fg'
                    }`}
                  >
                    {action.label}
                  </Text>
                  {action.description && (
                    <Text className="text-caption text-muted text-right">
                      {action.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
