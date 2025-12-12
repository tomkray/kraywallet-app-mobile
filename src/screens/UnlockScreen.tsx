/**
 * Unlock Screen
 * Password screen when wallet is locked
 * Style: Clean black & white
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import { KrayLogo } from '../components/KrayLogo';

interface UnlockScreenProps {
  onUnlock: () => void;
  onRestore: () => void;
}

export function UnlockScreen({ onUnlock, onRestore }: UnlockScreenProps) {
  const { unlockWallet } = useWallet();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await unlockWallet(password);

      if (success) {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onUnlock();
      } else {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setError('Incorrect password');
        setPassword('');
      }
    } catch (err) {
      setError('Failed to unlock wallet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <KrayLogo 
                size={100} 
                color="#fff" 
                showBackground={false}
                glow={true}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your password to unlock</Text>

            {/* Password Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleUnlock}
                  returnKeyType="done"
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

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>

            {/* Unlock Button */}
            <TouchableOpacity
              style={[styles.unlockButton, isLoading && styles.unlockButtonDisabled]}
              onPress={handleUnlock}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="lock-open" size={20} color="#000" />
                  <Text style={styles.unlockButtonText}>Unlock Wallet</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Restore Link */}
            <TouchableOpacity style={styles.restoreLink} onPress={onRestore}>
              <Text style={styles.restoreLinkText}>
                Forgot password? <Text style={styles.restoreHighlight}>Restore wallet</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 50,
  },
  inputSection: {
    width: '100%',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 10,
    ...Platform.select({
      web: {
        // @ts-ignore
        outline: 'none',
        outlineStyle: 'none',
      },
    }),
  },
  eyeButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 6,
    fontWeight: '500',
  },
  unlockButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  unlockButtonDisabled: {
    opacity: 0.5,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  restoreLink: {
    marginTop: 30,
    padding: 12,
  },
  restoreLinkText: {
    fontSize: 14,
    color: '#888',
  },
  restoreHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
});
