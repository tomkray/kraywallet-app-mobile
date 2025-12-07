/**
 * Create Wallet Screen
 * Generate new wallet with 12 or 24 words
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';

interface CreateWalletScreenProps {
  onBack: () => void;
  onSuccess: (mnemonic: string[]) => void;
}

export function CreateWalletScreen({ onBack, onSuccess }: CreateWalletScreenProps) {
  const { createWallet, isLoading } = useWallet();
  
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');

    // Validations
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const mnemonic = await createWallet(password, wordCount);
      onSuccess(mnemonic);
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError('Failed to create wallet. Please try again.');
    }
  };

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
          <Text style={styles.headerTitle}>Create Wallet</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Word Count Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Mnemonic Length</Text>
            <View style={styles.wordCountSelector}>
              <TouchableOpacity
                style={[
                  styles.wordCountOption,
                  wordCount === 12 && styles.wordCountOptionActive,
                ]}
                onPress={() => setWordCount(12)}
              >
                <Text
                  style={[
                    styles.wordCountText,
                    wordCount === 12 && styles.wordCountTextActive,
                  ]}
                >
                  12 words
                </Text>
                <Text style={styles.wordCountSubtext}>Recommended</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.wordCountOption,
                  wordCount === 24 && styles.wordCountOptionActive,
                ]}
                onPress={() => setWordCount(24)}
              >
                <Text
                  style={[
                    styles.wordCountText,
                    wordCount === 24 && styles.wordCountTextActive,
                  ]}
                >
                  24 words
                </Text>
                <Text style={styles.wordCountSubtext}>More secure</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
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
            <Text style={styles.hint}>Minimum 8 characters</Text>
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

          {/* Security Notice */}
          <View style={styles.notice}>
            <Ionicons name="shield-checkmark" size={24} color="#f7931a" />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Security First</Text>
              <Text style={styles.noticeText}>
                Your password encrypts your wallet locally. We never store your password or recovery phrase on any server.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Generate Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
            onPress={handleCreate}
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
                  <Ionicons name="key" size={22} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Wallet</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordCountSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  wordCountOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  wordCountOptionActive: {
    borderColor: '#f7931a',
    backgroundColor: 'rgba(247,147,26,0.1)',
  },
  wordCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888',
    marginBottom: 4,
  },
  wordCountTextActive: {
    color: '#f7931a',
  },
  wordCountSubtext: {
    fontSize: 12,
    color: '#666',
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
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
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
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(247,147,26,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(247,147,26,0.2)',
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
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonDisabled: {
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
});

