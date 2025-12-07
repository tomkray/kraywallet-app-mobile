/**
 * Restore Wallet Screen
 * Import existing wallet from mnemonic
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';

interface RestoreWalletScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function RestoreWalletScreen({ onBack, onSuccess }: RestoreWalletScreenProps) {
  const { restoreWallet, isLoading } = useWallet();
  
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validateMnemonic = (phrase: string): boolean => {
    const words = phrase.trim().toLowerCase().split(/\s+/);
    return words.length === 12 || words.length === 24;
  };

  const handleRestore = async () => {
    setError('');

    // Validate mnemonic
    const cleanMnemonic = mnemonic.trim().toLowerCase();
    if (!validateMnemonic(cleanMnemonic)) {
      setError('Please enter a valid 12 or 24 word recovery phrase');
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await restoreWallet(cleanMnemonic, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (err) {
      console.error('Error restoring wallet:', err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Failed to restore wallet. Please check your recovery phrase.');
    }
  };

  const wordCount = mnemonic.trim() ? mnemonic.trim().split(/\s+/).length : 0;

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restore Wallet</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Mnemonic Input */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Recovery Phrase</Text>
                <Text style={[
                  styles.wordCount,
                  (wordCount === 12 || wordCount === 24) && styles.wordCountValid
                ]}>
                  {wordCount} words
                </Text>
              </View>
              <TextInput
                style={styles.mnemonicInput}
                placeholder="Enter your 12 or 24 word recovery phrase"
                placeholderTextColor="#666"
                value={mnemonic}
                onChangeText={setMnemonic}
                multiline
                numberOfLines={4}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>Separate each word with a space</Text>
            </View>

            {/* Password Input */}
            <View style={styles.section}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.section}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Info Notice */}
            <View style={styles.notice}>
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>Restore from Backup</Text>
                <Text style={styles.noticeText}>
                  Enter the recovery phrase you saved when creating your wallet. This will restore your Bitcoin address and balance.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Restore Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.restoreButton, isLoading && styles.restoreButtonDisabled]}
              onPress={handleRestore}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? ['#666', '#555'] : ['#f7931a', '#e67e00']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={22} color="#fff" />
                    <Text style={styles.restoreButtonText}>Restore Wallet</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordCount: {
    fontSize: 12,
    color: '#666',
  },
  wordCountValid: {
    color: '#10b981',
  },
  mnemonicInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 10,
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  restoreButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  restoreButtonDisabled: {
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  restoreButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
});

