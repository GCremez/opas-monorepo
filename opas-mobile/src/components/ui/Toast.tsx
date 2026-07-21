import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Text, Animated } from 'react-native';

interface ToastConfig {
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({
  message,
  duration = 2800,
  onDismiss,
}: ToastConfig) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, duration);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      className="self-center px-5 py-2.5 rounded-full bg-surface border border-border/60"
      style={{
        opacity,
        transform: [{ translateY }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <Text className="text-[13px] text-fg font-medium text-center leading-[1.3]">
        {message}
      </Text>
    </Animated.View>
  );
}
