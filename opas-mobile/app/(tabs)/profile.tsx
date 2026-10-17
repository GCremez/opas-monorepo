import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Pressable, Modal, KeyboardAvoidingView, Platform, Alert as RNAlert, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ConfirmSheet } from '../../src/components/ui/ConfirmSheet';
import { BottomSheet } from '../../src/components/ui/BottomSheet';

import { useToast } from '../../src/components/ui/ToastProvider';
import { EyeIcon, EyeOffIcon, CheckIcon, ChevronRightIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useReminderStore } from '../../src/store/reminderStore';
import { useThemeStore, useThemeColors, type Appearance_ } from '../../src/store/themeStore';

type Lang = 'en' | 'fi' | 'sv';

const LANGUAGES: { key: Lang; labelKey: string; nativeKey: string }[] = [
  { key: 'en', labelKey: 'profile.lang_en', nativeKey: 'profile.lang_en_native' },
  { key: 'fi', labelKey: 'profile.lang_fi', nativeKey: 'profile.lang_fi_native' },
  { key: 'sv', labelKey: 'profile.lang_sv', nativeKey: 'profile.lang_sv_native' },
];

type AccountLink = {
  key: string;
  valueKey?: string;
  accent?: boolean;
  destructive?: boolean;
  route?: string;
};

const ACCOUNT_LINKS: AccountLink[] = [
  { key: 'subscription', valueKey: 'subscription_value', accent: true, route: '/subscription' },
  { key: 'help', route: 'help' },
  { key: 'privacy', route: 'privacy' },
  { key: 'change_password', route: 'change-password' },
  { key: 'delete_account', destructive: true, route: 'delete' },
];

const APPEARANCE: { key: Appearance_; label: string }[] = [
  { key: 'paper', label: 'Paper' },
  { key: 'ink', label: 'Ink' },
  { key: 'system', label: 'System' },
];

// Must match registration (register.tsx) and the backend's ChangePasswordRequest
// @Size(min = 8); a lower value here would let users downgrade to a weaker password.
const MIN_PASSWORD_LENGTH = 8;

// Section header — tracked caps over a rule underline.
function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="font-semibold text-label uppercase text-fg pb-2.5 mb-1 border-b border-rule">
      {title}
    </Text>
  );
}

// Value row (design 2f): label left, mono uppercase value + chevron right.
function ValueRow({
  label, value, valueTone = 'text-muted', hideChevron, onPress, c,
}: {
  label: string; value?: string; valueTone?: string; hideChevron?: boolean;
  onPress?: () => void; c: { muted: string };
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-center justify-between py-4 border-b border-line"
      accessibilityLabel={`${label}${value ? ` — ${value}` : ''}`}
    >
      <Text className="font-medium text-body text-fg">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {value ? <Text className={`font-mono text-label tracking-[0.05em] uppercase ${valueTone}`}>{value}</Text> : null}
        {hideChevron ? <View className="w-[15px]" /> : <ChevronRightIcon size={15} color={c.muted} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { logout, deleteAccount: deleteAccountAction, changePassword, user, plan } = useAuthStore();
  const { subscription, fetchSubscription, usage, fetchUsage } = useSubscriptionStore();
  const appearance = useThemeStore((s) => s.preference);
  const setAppearance = useThemeStore((s) => s.setPreference);
  const { showToast } = useToast();
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Lang>(
    i18n.language?.startsWith('fi') ? 'fi' : i18n.language?.startsWith('sv') ? 'sv' : 'en'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [appearanceSheetOpen, setAppearanceSheetOpen] = useState(false);
  // Deadline reminders: on only when the user wants them and the system allows them.
  const remindersWanted = useReminderStore((s) => s.enabled);
  const remindersAllowed = useReminderStore((s) => s.permission === 'granted');
  const deadlineOn = remindersWanted && remindersAllowed;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, []);

  const { meetsLength, strengthScore, strengthColor, passwordsMatch, pwRules } = useMemo(() => {
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

    const color = score === 0 ? c.muted : score <= 30 ? c.danger : score <= 55 ? c.warning : c.accent;

    return {
      meetsLength: ml,
      strengthScore: score,
      strengthColor: color,
      passwordsMatch: pwNew === pwConfirm,
      pwRules: [
        { key: 'password_min_chars', met: ml },
        { key: 'password_lowercase', met: hl },
        { key: 'password_uppercase', met: hu },
        { key: 'password_number', met: hn },
        { key: 'password_special', met: hs },
      ],
    };
  }, [pwNew, pwConfirm, c]);

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
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? '·';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} accessibilityLabel={t('profile.title')} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Masthead + identity (design 2f) */}
        <View className="px-6 pt-3 pb-8 items-center">
          <Text className="self-start font-semibold text-label tracking-[0.20em] uppercase text-muted">Opas · {t('tabs.you')}</Text>
          <View className="w-20 h-20 rounded-full bg-accent items-center justify-center mt-6">
            <Text className="font-display text-[30px] text-on-accent">{initial}</Text>
          </View>
          <Text className="font-display text-title text-fg mt-4" numberOfLines={1}>{user?.name ?? ''}</Text>
          <Text className="font-mono text-label tracking-[0.05em] uppercase text-muted mt-1.5">
            {tier === 'premium' ? t('profile.premium_plan') : t('profile.free_plan')}
            {/* Spell out "left": a bare "5/5" read as five of five already used. */}
            {usage && tier !== 'premium'
              ? ` · ${t('profile.remaining_short', { remaining: usage.remaining, limit: usage.limit })}`
              : ''}
          </Text>
        </View>

        {/* Settings — value rows */}
        <View className="px-6 mb-8">
          <SectionHeader title={t('profile.settings')} />
          <ValueRow c={c} label={t('profile.app_language')} value={langLabel ? t(langLabel.labelKey) : i18n.language} onPress={() => setLangSheetOpen(true)} />
          <ValueRow c={c} label={t('profile.appearance')} value={t(`profile.appearance_${appearance}`)} onPress={() => setAppearanceSheetOpen(true)} />
          <ValueRow
            c={c}
            label={t('profile.deadline_reminders')}
            value={deadlineOn ? t('profile.on') : t('profile.off')}
            valueTone={deadlineOn ? 'text-accent' : 'text-muted'}
            hideChevron
            onPress={async () => {
              const on = await useReminderStore.getState().setEnabled(!deadlineOn);
              // Asked to turn on but the system said no: point to Settings rather than fail silently.
              showToast(!deadlineOn && !on ? t('reminders.blocked') : `${t('profile.deadline_reminders')} ${on ? t('profile.on') : t('profile.off')}`);
            }}
          />
        </View>

        {/* Account */}
        <View className="px-6 mb-8">
          <SectionHeader title={t('profile.account')} />
          {ACCOUNT_LINKS.map((item) => {
            const handlePress = () => {
              if (item.route === 'change-password') setShowPasswordSheet(true);
              else if (item.route === 'delete') setShowDeleteConfirm(true);
              else if (item.route === 'help') Linking.openURL('https://docs.opas.app');
              else if (item.route === 'privacy') Linking.openURL('https://opas.app/privacy');
              else if (item.route) router.push(item.route as any);
            };
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.7}
                onPress={handlePress}
                className="flex-row items-center justify-between py-4 border-b border-line"
                accessibilityLabel={t(`profile.${item.key}`)}
              >
                <Text className={`font-medium text-body ${item.destructive ? 'text-danger' : 'text-fg'}`}>
                  {t(`profile.${item.key}`)}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  {item.valueKey && (
                    <Text className={`font-body text-body-sm ${item.accent ? 'text-accent' : 'text-muted'}`}>
                      {item.key === 'subscription'
                        ? t(tier === 'premium' ? 'profile.subscription_value' : 'profile.subscription_value_free')
                        : t(`profile.${item.valueKey}`)}
                    </Text>
                  )}
                  {!item.destructive && <ChevronRightIcon size={16} color={c.muted} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sign out */}
        <View className="items-center pt-2 pb-6">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowLogoutConfirm(true)}
            className="py-3 min-h-touch justify-center"
            accessibilityLabel={t('profile.sign_out')}
          >
            <Text className="font-semibold text-label tracking-[0.14em] uppercase text-danger">{t('profile.sign_out')}</Text>
          </TouchableOpacity>
          <Text className="font-mono text-meta text-muted mt-1">{t('profile.version')}</Text>
        </View>
      </ScrollView>

      <BottomSheet
        visible={langSheetOpen}
        onClose={() => setLangSheetOpen(false)}
        actions={LANGUAGES.map((lang) => ({
          icon: selectedLang === lang.key ? <CheckIcon size={18} color={c.accent} /> : undefined,
          label: `${t(lang.labelKey)} — ${t(lang.nativeKey)}`,
          onPress: () => {
            setSelectedLang(lang.key);
            i18n.changeLanguage(lang.key);
            setLangSheetOpen(false);
            showToast(t(lang.labelKey));
          },
        }))}
      />

      <BottomSheet
        visible={appearanceSheetOpen}
        title={t('profile.appearance')}
        onClose={() => setAppearanceSheetOpen(false)}
        actions={APPEARANCE.map((opt) => ({
          icon: appearance === opt.key ? <CheckIcon size={18} color={c.accent} /> : undefined,
          label: t(`profile.appearance_${opt.key}`),
          onPress: () => {
            setAppearance(opt.key);
            setAppearanceSheetOpen(false);
            showToast(t(`profile.appearance_${opt.key}`));
          },
        }))}
      />

      <Modal visible={showPasswordSheet} transparent animationType="slide" onRequestClose={resetPasswordForm}>
        <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-5 py-3">
            <TouchableOpacity onPress={resetPasswordForm} className="min-h-touch justify-center">
              <Text className="font-medium text-body text-fg-soft">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text className="font-display text-heading text-fg">{t('profile.change_password')}</Text>
            <TouchableOpacity
              onPress={handleChangePassword}
              className="min-h-touch justify-center"
              disabled={!pwCurrent || pwNew.length < 6 || !passwordsMatch || savingPw}
            >
              {savingPw ? (
                <Text className="font-medium text-body text-muted" accessibilityLabel={t('common.saving')}>{t('common.saving')}</Text>
              ) : (
                <Text className={`font-semibold text-body ${!pwCurrent || pwNew.length < 6 || !passwordsMatch ? 'text-muted' : 'text-accent'}`}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView className="flex-1 px-6 pt-5" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
              <Text className="font-semibold text-label uppercase text-muted mb-3">{t('profile.current_password')}</Text>
              <View className="bg-surface border border-line rounded-md mb-7 overflow-hidden">
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 font-body text-[16px] text-fg px-4 py-3.5"
                    placeholder="••••••••"
                    placeholderTextColor={c.muted}
                    value={pwCurrent}
                    onChangeText={setPwCurrent}
                    secureTextEntry={!showPw.current}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPw((p) => ({ ...p, current: !p.current }))} className="px-4 py-3.5" accessibilityLabel={showPw.current ? t('common.hide') : t('common.show')} accessibilityRole="button">
                    {showPw.current ? <EyeOffIcon size={20} color={c.muted} /> : <EyeIcon size={20} color={c.muted} />}
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="font-semibold text-label uppercase text-muted mb-3">{t('profile.new_password')}</Text>
              <View className="bg-surface border border-line rounded-md mb-7 overflow-hidden">
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 font-body text-[16px] text-fg px-4 py-3.5"
                    placeholder={t('profile.new_password_placeholder')}
                    placeholderTextColor={c.muted}
                    value={pwNew}
                    onChangeText={setPwNew}
                    secureTextEntry={!showPw.new}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPw((p) => ({ ...p, new: !p.new }))} className="px-4 py-3.5" accessibilityLabel={showPw.new ? t('common.hide') : t('common.show')} accessibilityRole="button">
                    {showPw.new ? <EyeOffIcon size={20} color={c.muted} /> : <EyeIcon size={20} color={c.muted} />}
                  </TouchableOpacity>
                </View>
                {pwNew.length > 0 && (
                  <View className="px-4 pb-3.5 pt-2.5">
                    <View className="h-1 rounded-pill bg-surface-2 mb-2 overflow-hidden">
                      <View className="h-full rounded-pill" style={{ width: `${strengthScore}%`, backgroundColor: strengthColor }} />
                    </View>
                    <View className="flex-row flex-wrap gap-x-3 gap-y-0.5">
                      {pwRules.map((r) => (
                        <Text key={r.key} className={`font-body text-body-sm ${r.met ? 'text-accent' : 'text-muted'}`}>
                          {r.met ? '✓' : '○'} {t(`profile.${r.key}`)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Text className="font-semibold text-label uppercase text-muted mb-3">{t('profile.confirm_password')}</Text>
              <View className={`bg-surface border rounded-md mb-7 overflow-hidden ${pwConfirm.length > 0 && !passwordsMatch ? 'border-danger' : 'border-line'}`}>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 font-body text-[16px] text-fg px-4 py-3.5"
                    placeholder="••••••••"
                    placeholderTextColor={c.muted}
                    value={pwConfirm}
                    onChangeText={setPwConfirm}
                    secureTextEntry={!showPw.confirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))} className="px-4 py-3.5" accessibilityLabel={showPw.confirm ? t('common.hide') : t('common.show')} accessibilityRole="button">
                    {showPw.confirm ? <EyeOffIcon size={20} color={c.muted} /> : <EyeIcon size={20} color={c.muted} />}
                  </TouchableOpacity>
                </View>
                {pwConfirm.length > 0 && !passwordsMatch && (
                  <View className="px-4 pb-3.5 pt-2.5">
                    <Text className="font-body text-body-sm text-danger">{t('profile.password_mismatch')}</Text>
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
