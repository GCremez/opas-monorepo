import * as React from 'react';
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from './Toast';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string) => {
    idRef.current += 1;
    setToast(message);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Modal transparent visible={toast !== null} animationType="none" onRequestClose={() => {}}>
        <View style={{ flex: 1 }} pointerEvents="box-none">
          <View
            style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0 }}
            pointerEvents="box-none"
          >
            {toast && (
              <Toast message={toast} onDismiss={dismissToast} />
            )}
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}
