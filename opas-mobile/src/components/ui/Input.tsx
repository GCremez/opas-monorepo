import * as React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className = '', ...props }: InputProps) {
  return (
    <View className="w-full mb-4">
      {label && (
        <Text className="text-body-sm font-medium text-fg mb-2">{label}</Text>
      )}
      <TextInput
        placeholderTextColor="#86868b"
        className={`
          font-body text-[16px] text-fg bg-surface border
          px-4 py-3 rounded-md min-h-touch
          ${error ? 'border-danger' : 'border-border'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <Text className="text-caption text-danger mt-2">{error}</Text>
      )}
      {hint && !error && (
        <Text className="text-caption text-muted mt-2">{hint}</Text>
      )}
    </View>
  );
}
