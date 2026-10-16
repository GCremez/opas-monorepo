import * as React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback>
            <View
              className="bg-bg rounded-t-xl pt-4 px-6"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              <View className="w-9 h-1 rounded-pill bg-surface-2 mx-auto mb-5" />
              {title && (
                <Text className="font-semibold text-label uppercase text-muted mb-3 pb-2.5 border-b border-rule" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  className="flex-row items-center gap-3 py-4 min-h-touch"
                >
                  {action.icon && <View className="w-6 h-6 items-center justify-center">{action.icon}</View>}
                  <Text className={`flex-1 font-display text-[17px] ${action.destructive ? 'text-danger' : 'text-fg'}`}>
                    {action.label}
                  </Text>
                  {action.description && (
                    <Text className="font-mono text-meta text-muted text-right">{action.description}</Text>
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
