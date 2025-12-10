/**
 * Welcome Screen
 * KRAY OS Style - Black & White
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KrayLogo } from '../components/KrayLogo';
import colors from '../theme/colors';

interface WelcomeScreenProps {
  onCreateWallet: () => void;
  onRestoreWallet: () => void;
}

export function WelcomeScreen({ onCreateWallet, onRestoreWallet }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* KRAY Logo */}
          <View style={styles.logoContainer}>
            <KrayLogo size={100} />
          </View>

          <Text style={styles.title}>KrayWallet</Text>
          <Text style={styles.subtitle}>Your Sovereign Bitcoin Wallet</Text>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="flash" text="Taproot (P2TR)" />
            <FeatureItem icon="lock-closed" text="Self-Custody" />
            <FeatureItem icon="layers" text="Ordinals & Runes" />
            <FeatureItem icon="flash-outline" text="KRAY L2" />
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onCreateWallet}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color={colors.buttonPrimaryText} />
              <Text style={styles.buttonText}>Create New Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onRestoreWallet}
              activeOpacity={0.8}
            >
              <Ionicons name="key" size={18} color={colors.buttonSecondaryText} />
              <Text style={styles.secondaryButtonText}>Restore Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 Your keys, your Bitcoin</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={18} color={colors.textPrimary} />
      <Text style={styles.featureText}>{text}</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 36,
  },
  features: {
    width: '100%',
    marginBottom: 36,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 14,
    fontWeight: '500',
  },
  buttons: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.buttonSecondaryBorder,
    backgroundColor: colors.buttonSecondary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonSecondaryText,
    marginLeft: 10,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.textDark,
  },
});
