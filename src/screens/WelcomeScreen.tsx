/**
 * Welcome Screen
 * KRAY OS Style - Premium Dark
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KrayLogo } from '../components/KrayLogo';
import colors from '../theme/colors';

interface WelcomeScreenProps {
  onCreateWallet: () => void;
  onRestoreWallet: () => void;
}

export function WelcomeScreen({ onCreateWallet, onRestoreWallet }: WelcomeScreenProps) {
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.topSection}>
            {/* KRAY Logo */}
            <View style={styles.logoContainer}>
              <KrayLogo size={120} />
            </View>

            <Text style={styles.title}>KrayWallet</Text>
            <Text style={styles.subtitle}>Sovereign Bitcoin Architecture</Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="flash" text="Taproot (P2TR) Ready" highlight />
            <FeatureItem icon="shield-checkmark" text="Non-Custodial Security" />
            <FeatureItem icon="layers" text="Ordinals & Runes Support" />
            <FeatureItem icon="cube" text="L2 Lightning Integration" />
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onCreateWallet}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Ionicons name="add-circle" size={24} color={colors.black} />
                <Text style={styles.buttonText}>Create New Wallet</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onRestoreWallet}
              activeOpacity={0.8}
            >
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Restore Existing Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Ionicons name="lock-closed" size={10} color={colors.textDark} /> Your keys, your Bitcoin
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FeatureItem({ icon, text, highlight }: { icon: string; text: string; highlight?: boolean }) {
  return (
    <View style={[styles.featureItem, highlight && styles.featureItemHighlight]}>
      <View style={[styles.iconContainer, highlight && styles.iconHighlight]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={highlight ? colors.primary : colors.textSecondary}
        />
      </View>
      <Text style={[styles.featureText, highlight && styles.featureTextHighlight]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 240, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  features: {
    width: '100%',
    marginVertical: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundGlass,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureItemHighlight: {
    borderColor: colors.borderHighlight,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconHighlight: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  featureText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  featureTextHighlight: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  buttons: {
    width: '100%',
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 10,
  },
  footer: {
    paddingBottom: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textDark,
  },
});
