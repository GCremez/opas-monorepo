import * as React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { useThemeColors } from '../../store/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className = '', ...props }: InputProps) {
  const c = useThemeColors();
  return (
    <View className="w-full mb-5">
      {label && (
        <Text className="font-semibold text-label uppercase text-muted mb-2">{label}</Text>
      )}
      <TextInput
        placeholderTextColor={c.muted}
        className={`
          font-body text-[16px] text-fg bg-surface border
          px-4 py-3.5 rounded-md min-h-touch
          ${error ? 'border-danger' : 'border-line'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <Text className="font-body text-body-sm text-danger mt-2">{error}</Text>
      )}
      {hint && !error && (
        <Text className="font-body text-body-sm text-muted mt-2">{hint}</Text>
      )}
    </View>
  );
}
