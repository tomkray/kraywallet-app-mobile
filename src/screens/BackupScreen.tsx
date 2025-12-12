/**
 * Backup Screen
 * Show recovery phrase for backup
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface BackupScreenProps {
  mnemonic: string[];
  onContinue: () => void;
}

export function BackupScreen({ mnemonic, onContinue }: BackupScreenProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(mnemonic.join(' '));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.headerTitle}>Backup Phrase</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Warning */}
          <View style={styles.warning}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Important!</Text>
              <Text style={styles.warningText}>
                Write down these words in order and keep them safe. Never share your recovery phrase with anyone. Anyone with this phrase can access your Bitcoin.
              </Text>
            </View>
          </View>

          {/* Mnemonic Grid */}
          <View style={styles.mnemonicContainer}>
            <View style={styles.mnemonicGrid}>
              {mnemonic.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={styles.wordNumber}>{index + 1}</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>

            {/* Copy Button */}
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? '#10b981' : '#888'}
              />
              <Text style={[styles.copyButtonText, copied && styles.copiedText]}>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Tips */}
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>🔐 Security Tips</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Write on paper, not digitally</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Store in a secure location</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Never share with anyone</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.tipText}>Consider a metal backup for fire/water protection</Text>
            </View>
          </View>

          {/* Confirmation Checkbox */}
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setConfirmed(!confirmed)}
          >
            <View style={[styles.checkboxBox, confirmed && styles.checkboxBoxChecked]}>
              {confirmed && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>
              I have securely saved my recovery phrase
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, !confirmed && styles.continueButtonDisabled]}
            onPress={onContinue}
            disabled={!confirmed}
          >
            <LinearGradient
              colors={confirmed ? ['#10b981', '#059669'] : ['#333', '#222']}
              style={styles.buttonGradient}
            >
              <Text style={[styles.continueButtonText, !confirmed && styles.disabledText]}>
                Continue to Wallet
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={confirmed ? '#fff' : '#666'}
              />
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
  headerLeft: {
    width: 40,
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
  warning: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  mnemonicContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordItem: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  wordNumber: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    width: 20,
  },
  wordText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  copyButtonText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  copiedText: {
    color: '#10b981',
  },
  tips: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  disabledText: {
    color: '#666',
  },
});






