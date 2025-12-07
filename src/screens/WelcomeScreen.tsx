/**
 * Welcome Screen
 * First screen when no wallet exists
 * KRAY OS Style - Black & White with KRAY Logo
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WelcomeScreenProps {
  onCreateWallet: () => void;
  onRestoreWallet: () => void;
}

export function WelcomeScreen({ onCreateWallet, onRestoreWallet }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Main Content */}
        <View style={styles.content}>
          {/* KRAY Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
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
              <Ionicons name="add-circle" size={20} color="#000" />
              <Text style={styles.buttonText}>Create New Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onRestoreWallet}
              activeOpacity={0.8}
            >
              <Ionicons name="key" size={18} color="#fff" />
              <Text style={styles.secondaryButtonText}>Restore Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
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
      <Ionicons name={icon as any} size={18} color="#fff" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  features: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '500',
  },
  buttons: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#555',
  },
});
