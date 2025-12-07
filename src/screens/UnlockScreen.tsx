/**
 * Unlock Screen
 * Password screen when wallet is locked
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';

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
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#f7931a', '#ff6b00']}
                style={styles.logoGradient}
              >
                <Ionicons name="lock-closed" size={40} color="#fff" />
              </LinearGradient>
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
              <LinearGradient
                colors={isLoading ? ['#666', '#555'] : ['#f7931a', '#e67e00']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-open" size={20} color="#fff" />
                    <Text style={styles.unlockButtonText}>Unlock Wallet</Text>
                  </>
                )}
              </LinearGradient>
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
    marginBottom: 32,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  inputSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 18,
  },
  eyeButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 6,
  },
  unlockButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  unlockButtonDisabled: {
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  unlockButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  restoreLink: {
    marginTop: 24,
    padding: 12,
  },
  restoreLinkText: {
    fontSize: 14,
    color: '#888',
  },
  restoreHighlight: {
    color: '#f7931a',
    fontWeight: '600',
  },
});

