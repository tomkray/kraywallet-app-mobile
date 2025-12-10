/**
 * Settings Screen
 * KRAY OS Style - Black & White
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import colors from '../theme/colors';

interface SettingsScreenProps {
  onBack: () => void;
  onBackup: () => void;
}

export function SettingsScreen({ onBack, onBackup }: SettingsScreenProps) {
  const { lockWallet, resetWallet } = useWallet();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLock = async () => {
    await lockWallet();
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Wallet',
      'This will delete all wallet data. Make sure you have backed up your recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetWallet();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Security Section */}
          <Text style={styles.sectionTitle}>SECURITY</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={onBackup}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-text" size={20} color={colors.textPrimary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Backup Phrase</Text>
                  <Text style={styles.menuItemSubtitle}>View your recovery phrase</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="finger-print" size={20} color={colors.textPrimary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Biometric Lock</Text>
                  <Text style={styles.menuItemSubtitle}>Use Face ID or Touch ID</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: colors.backgroundCard, true: colors.textPrimary }}
                thumbColor={colors.white}
              />
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleLock}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed" size={20} color={colors.textPrimary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Lock Wallet</Text>
                  <Text style={styles.menuItemSubtitle}>Require password to access</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.section}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="information-circle" size={20} color={colors.textPrimary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Version</Text>
                  <Text style={styles.menuItemSubtitle}>2.0.0</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="help-circle" size={20} color={colors.textPrimary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Help & Support</Text>
                  <Text style={styles.menuItemSubtitle}>Get help with KrayWallet</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItemDanger} onPress={handleReset}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, styles.iconContainerDanger]}>
                  <Ionicons name="trash" size={20} color={colors.error} />
                </View>
                <View>
                  <Text style={styles.menuItemTitleDanger}>Reset Wallet</Text>
                  <Text style={styles.menuItemSubtitle}>Delete all wallet data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    marginTop: 24,
    letterSpacing: 1,
  },
  section: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconContainerDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuItemTitleDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
