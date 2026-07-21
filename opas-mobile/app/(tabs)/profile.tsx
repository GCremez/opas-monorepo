import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert as RNAlert, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ConfirmSheet } from '../../src/components/ui/ConfirmSheet';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Toggle } from '../../src/components/ui/Toggle';

import { useToast } from '../../src/components/ui/ToastProvider';
import { ProfileIcon, BellIcon, EyeIcon, EyeOffIcon, LockIcon, LogOutIcon, CheckIcon, CalendarIcon, ChevronRightIcon, MailIcon, KeyIcon, TrashIcon } from '../../src/components/icons';
import { colors } from '../../src/lib/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';

type Lang = 'en' | 'fi' | 'sv';

const LANGUAGES: { key: Lang; labelKey: string; nativeKey: string }[] = [
  { key: 'en', labelKey: 'profile.lang_en', nativeKey: 'profile.lang_en_native' },
  { key: 'fi', labelKey: 'profile.lang_fi', nativeKey: 'profile.lang_fi_native' },
  { key: 'sv', labelKey: 'profile.lang_sv', nativeKey: 'profile.lang_sv_native' },
];

const SETTINGS = [
  { key: 'notifications', icon: BellIcon, descKey: 'notifications_desc' },
  { key: 'auto_detect', icon: EyeIcon, descKey: 'auto_detect_desc' },
  { key: 'biometric', icon: LockIcon, descKey: 'biometric_desc' },
  { key: 'auto_archive', icon: CalendarIcon, descKey: 'auto_archive_desc' },
] as const;

type AccountLink = {
  key: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  valueKey?: string;
  accent?: boolean;
  destructive?: boolean;
  route?: string;
};

const ACCOUNT_LINKS: AccountLink[] = [
  { key: 'subscription', icon: CheckIcon, valueKey: 'subscription_value', accent: true, route: '/subscription' },
  { key: 'help', icon: MailIcon, route: 'help' },
  { key: 'privacy', icon: LockIcon, route: 'privacy' },
  { key: 'change_password', icon: KeyIcon, route: 'change-password' },
  { key: 'delete_account', icon: TrashIcon, destructive: true, route: 'delete' },
];

const MIN_PASSWORD_LENGTH = 6;

function getStrengthColor(score: number): string {
  if (score === 0) return colors.muted;
  if (score <= 30) return colors.danger;
  if (score <= 55) return colors.warning;
  if (score <= 80) return colors.accent;
  return colors.success;
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { logout, deleteAccount: deleteAccountAction, changePassword, user, plan } = useAuthStore();
  const { subscription, fetchSubscription, usage, fetchUsage } = useSubscriptionStore();
  const { showToast } = useToast();
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Lang>(
    i18n.language?.startsWith('fi') ? 'fi' : i18n.language?.startsWith('sv') ? 'sv' : 'en'
  );
  const [toggles, setToggles] = useState({ notifications: true, auto_detect: true, biometric: true, auto_archive: false });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, []);

  const { hasLower, hasUpper, hasNumber, hasSpecial, meetsLength, strengthScore, strengthColor, passwordsMatch, pwRules } = useMemo(() => {
    const hl = /[a-z]/.test(pwNew);
    const hu = /[A-Z]/.test(pwNew);
    const hn = /\d/.test(pwNew);
    const hs = /[^a-zA-Z0-9]/.test(pwNew);
    const ml = pwNew.length >= MIN_PASSWORD_LENGTH;

    let score = 0;
    if (ml) score += Math.min(25, pwNew.length * 3);
    if (hl) score += 15;
    if (hu) score += 15;
    if (hn) score += 15;
    if (hs) score += 15;
    if (pwNew.length >= 10) score += 15;
    score = Math.min(100, score);

    return {
      hasLower: hl,
      hasUpper: hu,
      hasNumber: hn,
      hasSpecial: hs,
      meetsLength: ml,
      strengthScore: score,
      strengthColor: getStrengthColor(score),
      passwordsMatch: pwNew === pwConfirm,
      pwRules: [
        { key: 'password_min_chars', met: ml },
        { key: 'password_lowercase', met: hl },
        { key: 'password_uppercase', met: hu },
        { key: 'password_number', met: hn },
        { key: 'password_special', met: hs },
      ],
    };
  }, [pwNew, pwConfirm]);

  const resetPasswordForm = useCallback(() => {
    setShowPasswordSheet(false);
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setShowPw({ current: false, new: false, confirm: false });
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await deleteAccountAction();
      showToast(t('profile.account_deleted'));
      router.replace('/(auth)/login');
    } catch {
      RNAlert.alert(t('common.error'), t('profile.delete_account_error'));
    }
  }, [deleteAccountAction, showToast, t, router]);

  const handleChangePassword = useCallback(async () => {
    if (!pwCurrent || !passwordsMatch || !meetsLength) return;
    setSavingPw(true);
    try {
      await changePassword(pwCurrent, pwNew);
      resetPasswordForm();
      showToast(t('profile.password_changed'));
    } catch (err: any) {
      const msg = err?.response
        ? t('profile.change_password_error')
        : err?.request
          ? t('profile.change_password_error_network')
          : t('profile.change_password_error_unknown');
      RNAlert.alert(t('common.error'), msg);
    } finally {
      setSavingPw(false);
    }
  }, [pwCurrent, pwNew, passwordsMatch, meetsLength, changePassword, showToast, t, resetPasswordForm]);

  const tier = subscription?.tier ?? plan;
  const langLabel = LANGUAGES.find((l) => l.key === selectedLang);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} accessibilityLabel={t('profile.title')}>
        <View className="px-5 pt-2 pb-6">
          <Text className="font-display text-heading-l text-fg tracking-[-0.02em]">
            {t('profile.title')}
          </Text>
        </View>

        <View className="items-center pb-8 px-5">
          <View className="w-[88px] h-[88px] rounded-full bg-accent-dim border-2 border-accent/30 items-center justify-center mb-4 shadow-lg shadow-accent/20">
            <ProfileIcon size={40} color={colors.accent} strokeWidth={1.5} />
          </View>
          <Text className="font-display text-heading-xl text-fg">
            {user?.name ?? ''}
          </Text>
          <Text className="text-body-sm text-muted mt-0.5">
            {user?.email ?? ''}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/subscription')}
            className={`mt-3 px-4 py-1.5 rounded-full flex-row items-center gap-1.5 ${
              tier === 'premium' ? 'bg-accent-dim' : 'bg-surface-2 border border-border'
            }`}
            activeOpacity={0.7}
          >
            <View className={`w-2 h-2 rounded-full ${tier === 'premium' ? 'bg-accent' : 'bg-muted'}`} />
            <Text className={`text-caption font-semibold ${tier === 'premium' ? 'text-accent' : 'text-muted'}`}>
              {tier === 'premium' ? t('profile.premium_plan') : t('profile.free_plan')}
            </Text>
          </TouchableOpacity>

          {usage && tier !== 'premium' && (
            <View className="mt-3 flex-row items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 py-3">
              <View className="w-2 h-2 rounded-full bg-accent" />
              <Text className="text-caption text-muted">
                {t('profile.remaining_decodes', { remaining: usage.remaining, limit: usage.limit })}
              </Text>
            </View>
          )}
        </View>

        <View className="px-5 mb-6">
          <Text className="font-display text-[13px] font-semibold text-muted uppercase tracking-[0.08em] mb-3 px-1">
            {t('profile.settings')}
          </Text>
          <View className="bg-surface border border-border rounded-xl overflow-hidden">
            {SETTINGS.map((item, i) => {
              const Icon = item.icon;
              const isOn = toggles[item.key as keyof typeof toggles];
              const isLast = i === SETTINGS.length - 1;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    const next = !isOn;
                    setToggles((prev) => ({ ...prev, [item.key]: next }));
                    showToast(`${t(`profile.${item.key}`)} ${next ? t('profile.toggle_on') : t('profile.toggle_off')}`);
                  }}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${!isLast ? 'border-b border-border' : ''}`}
                  accessibilityLabel={`${t(`profile.${item.key}`)} — ${isOn ? t('profile.toggle_on') : t('profile.toggle_off')}`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-9 h-9 rounded-lg bg-accent-dim items-center justify-center">
                      <Icon size={18} color={colors.accent} />
                    </View>
                    <View className="flex-1 pr-3">
                      <Text className="text-body-sm font-medium text-fg">
                        {t(`profile.${item.key}`)}
                      </Text>
                      <Text className="text-caption text-muted leading-[1.4]">
                        {t(`profile.${item.key}_desc`)}
                      </Text>
                    </View>
                  </View>
                  <Toggle on={isOn} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="px-5 mb-6">
          <Text className="font-display text-[13px] font-semibold text-muted uppercase tracking-[0.08em] mb-3 px-1">
            {t('profile.account')}
          </Text>
          <View className="bg-surface border border-border rounded-xl overflow-hidden">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setLangSheetOpen(true)}
              className="flex-row items-center justify-between px-4 py-3.5 border-b border-border"
            >
              <Text className="text-body-sm font-medium text-fg">{t('profile.app_language')}</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-body-sm text-muted">{langLabel ? t(langLabel.labelKey) : i18n.language}</Text>
                <ChevronRightIcon size={16} color={colors.muted} />
              </View>
            </TouchableOpacity>
            {ACCOUNT_LINKS.map((item, i) => {
              const isLast = i === ACCOUNT_LINKS.length - 1;
              const IconComponent = item.icon;
              const handlePress = () => {
                if (item.route === 'change-password') {
                  setShowPasswordSheet(true);
                } else if (item.route === 'delete') {
                  setShowDeleteConfirm(true);
                } else if (item.route === 'help') {
                  Linking.openURL('https://docs.opas.app');
                } else if (item.route === 'privacy') {
                  Linking.openURL('https://opas.app/privacy');
                } else if (item.route) {
                  router.push(item.route as any);
                }
              };
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  onPress={handlePress}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${!isLast ? 'border-b border-border' : ''}`}
                  accessibilityLabel={t(`profile.${item.key}`)}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    {IconComponent && (
                      <View className={`w-9 h-9 rounded-lg items-center justify-center ${item.destructive ? 'bg-danger/15' : 'bg-accent-dim'}`}>
                        <IconComponent size={18} color={item.destructive ? colors.danger : colors.accent} />
                      </View>
                    )}
                    <Text className={`text-body-sm font-medium ${item.destructive ? 'text-danger' : 'text-fg'}`}>
                      {t(`profile.${item.key}`)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    {item.valueKey && (
                      <Text className={`text-body-sm ${item.accent ? 'text-accent' : 'text-muted'}`}>
                        {t(`profile.${item.valueKey}`)}
                      </Text>
                    )}
                    {!item.destructive && <ChevronRightIcon size={16} color={colors.muted} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      <View className="items-center pb-24 pt-2">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowLogoutConfirm(true)}
          className="flex-row items-center justify-center gap-2 py-3 min-h-touch"
          accessibilityLabel={t('profile.sign_out')}
        >
          <LogOutIcon size={16} color={colors.danger} />
          <Text className="text-body-sm font-medium text-danger">{t('profile.sign_out')}</Text>
        </TouchableOpacity>
        <Text className="text-caption text-muted mt-1">{t('profile.version')}</Text>
      </View>

      <BottomSheet
        visible={langSheetOpen}
        onClose={() => setLangSheetOpen(false)}
        actions={LANGUAGES.map((lang) => ({
          icon: selectedLang === lang.key ? <CheckIcon size={18} color={colors.accent} /> : undefined,
          label: `${t(lang.labelKey)} — ${t(lang.nativeKey)}`,
          onPress: () => {
            setSelectedLang(lang.key);
            i18n.changeLanguage(lang.key);
            setLangSheetOpen(false);
            showToast(t(lang.labelKey));
          },
        }))}
      />

      <Modal visible={showPasswordSheet} transparent animationType="slide" onRequestClose={resetPasswordForm}>
        <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <TouchableOpacity onPress={resetPasswordForm} className="min-h-touch justify-center">
              <Text className="text-body font-medium text-accent">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text className="font-display text-heading-m text-fg">{t('profile.change_password')}</Text>
            <TouchableOpacity
              onPress={handleChangePassword}
              className="min-h-touch justify-center"
              disabled={!pwCurrent || pwNew.length < 6 || !passwordsMatch || savingPw}
            >
              {savingPw ? (
                <Text className="text-body font-medium text-muted" accessibilityLabel={t('common.saving')}>{t('common.saving')}</Text>
              ) : (
                <Text className={`text-body font-medium ${!pwCurrent || pwNew.length < 6 || !passwordsMatch ? 'text-muted' : 'text-accent'}`}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
              <Text className="text-caption font-medium text-muted uppercase tracking-[0.08em] mb-4">{t('profile.current_password')}</Text>
              <View className="bg-surface border border-border rounded-md mb-7 overflow-hidden">
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 font-body text-[16px] text-fg px-4 py-3.5"
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    value={pwCurrent}
                    onChangeText={setPwCurrent}
                    secureTextEntry={!showPw.current}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                    className="px-4 py-3.5"
                    accessibilityLabel={showPw.current ? t('common.hide') : t('common.show')}
                    accessibilityRole="button"
                  >
                    {showPw.current ? <EyeOffIcon size={20} color={colors.muted} /> : <EyeIcon size={20} color={colors.muted} />}
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-caption font-medium text-muted uppercase tracking-[0.08em] mb-4">{t('profile.new_password')}</Text>
              <View className="bg-surface border border-border rounded-md mb-7 overflow-hidden">
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 font-body text-[16px] text-fg px-4 py-3.5"
                    placeholder={t('profile.new_password_placeholder')}
                    placeholderTextColor={colors.muted}
                    value={pwNew}
                    onChangeText={setPwNew}
                    secureTextEntry={!showPw.new}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                    className="px-4 py-3.5"
                    accessibilityLabel={showPw.new ? t('common.hide') : t('common.show')}
                    accessibilityRole="button"
                  >
                    {showPw.new ? <EyeOffIcon size={20} color={colors.muted} /> : <EyeIcon size={20} color={colors.muted} />}
                  </TouchableOpacity>
                </View>
                {pwNew.length > 0 && (
                  <View className="px-4 pb-3.5 border-t border-border pt-2.5">
                    <View className="h-1 rounded-full bg-surface-3 mb-2 overflow-hidden">
                      <View className="h-full rounded-full" style={{ width: `${strengthScore}%`, backgroundColor: strengthColor }} />
                    </View>
                    <View className="flex-row flex-wrap gap-x-3 gap-y-0.5">
                      {pwRules.map((r) => (
                        <Text key={r.key} className={`text-caption ${r.met ? 'text-accent' : 'text-muted'}`}>
                          {r.met ? '\u2713' : '\u25CB'} {t(`profile.${r.key}`)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Text className="text-caption font-medium text-muted uppercase tracking-[0.08em] mb-4">{t('profile.confirm_password')}</Text>
              <View className={`bg-surface border rounded-md mb-7 overflow-hidden ${pwConfirm.length > 0 && !passwordsMatch ? 'border-danger' : 'border-border'}`}>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 font-body text-[16px] text-fg px-4 py-3.5"
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    value={pwConfirm}
                    onChangeText={setPwConfirm}
                    secureTextEntry={!showPw.confirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                    className="px-4 py-3.5"
                    accessibilityLabel={showPw.confirm ? t('common.hide') : t('common.show')}
                    accessibilityRole="button"
                  >
                    {showPw.confirm ? <EyeOffIcon size={20} color={colors.muted} /> : <EyeIcon size={20} color={colors.muted} />}
                  </TouchableOpacity>
                </View>
                {pwConfirm.length > 0 && !passwordsMatch && (
                  <View className="px-4 pb-3.5 border-t border-border pt-2.5">
                    <Text className="text-caption text-danger">{t('profile.password_mismatch')}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmSheet
        visible={showLogoutConfirm}
        title={t('profile.sign_out')}
        message={t('profile.sign_out_confirm')}
        confirmLabel={t('profile.sign_out')}
        destructive
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmSheet
        visible={showDeleteConfirm}
        title={t('profile.delete_account_confirm_title')}
        message={t('profile.delete_account_confirm_desc')}
        confirmLabel={t('profile.delete_account')}
        destructive
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await handleDeleteAccount();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </SafeAreaView>
  );
}
