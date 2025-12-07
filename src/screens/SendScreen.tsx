/**
 * Send Screen
 * Send Bitcoin to an address
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import * as api from '../services/api';

interface SendScreenProps {
  onBack: () => void;
  onSuccess: (txid: string) => void;
}

export function SendScreen({ onBack, onSuccess }: SendScreenProps) {
  const { wallet } = useWallet();
  
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState<'sats' | 'btc'>('sats');
  const [feeRate, setFeeRate] = useState<'fast' | 'medium' | 'slow'>('medium');
  const [fees, setFees] = useState({
    fast: 10,
    medium: 5,
    slow: 2,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      const feeRates = await api.getFeeRates();
      setFees({
        fast: feeRates.fastestFee,
        medium: feeRates.halfHourFee,
        slow: feeRates.hourFee,
      });
    } catch (err) {
      console.error('Error loading fees:', err);
    }
  };

  const getAmountInSats = (): number => {
    const value = parseFloat(amount) || 0;
    return amountType === 'btc' ? Math.floor(value * 100000000) : value;
  };

  const formatPreviewAmount = () => {
    const sats = getAmountInSats();
    if (amountType === 'sats') {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  const handleMax = () => {
    if (wallet?.balanceSats) {
      const maxAmount = wallet.balanceSats - (fees[feeRate] * 200); // Estimate tx size
      if (amountType === 'sats') {
        setAmount(Math.max(0, maxAmount).toString());
      } else {
        setAmount((Math.max(0, maxAmount) / 100000000).toFixed(8));
      }
    }
  };

  const validateAddress = (address: string): boolean => {
    // Basic validation - in production use bitcoinjs-lib
    return address.length >= 26 && address.length <= 62;
  };

  const handleSend = async () => {
    setError('');

    // Validate address
    if (!validateAddress(toAddress)) {
      setError('Invalid Bitcoin address');
      return;
    }

    // Validate amount
    const satsAmount = getAmountInSats();
    if (satsAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (satsAmount > (wallet?.balanceSats || 0)) {
      setError('Insufficient balance');
      return;
    }

    // Confirm transaction
    Alert.alert(
      '⚡ Confirm Transaction',
      `Send ${satsAmount.toLocaleString()} sats to:\n${toAddress.slice(0, 20)}...${toAddress.slice(-10)}\n\nFee: ~${fees[feeRate]} sat/vB`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setIsLoading(true);
            try {
              // In production, implement actual transaction creation and signing
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Simulate success
              setTimeout(() => {
                setIsLoading(false);
                onSuccess('simulated_txid_' + Date.now());
              }, 2000);
            } catch (err) {
              setError('Transaction failed. Please try again.');
              setIsLoading(false);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Send Bitcoin</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recipient Address */}
          <View style={styles.section}>
            <Text style={styles.label}>Recipient Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="bc1p... or 1... or 3..."
                placeholderTextColor="#666"
                value={toAddress}
                onChangeText={setToAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.scanButton}>
                <Ionicons name="scan" size={20} color="#f7931a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Amount</Text>
              <TouchableOpacity onPress={handleMax}>
                <Text style={styles.maxButton}>MAX</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#666"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.unitSelector}
                onPress={() => setAmountType(amountType === 'sats' ? 'btc' : 'sats')}
              >
                <Text style={styles.unitText}>{amountType.toUpperCase()}</Text>
                <Ionicons name="swap-vertical" size={14} color="#888" />
              </TouchableOpacity>
            </View>
            
            {amount ? (
              <Text style={styles.amountPreview}>≈ {formatPreviewAmount()}</Text>
            ) : null}
          </View>

          {/* Fee Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Transaction Speed</Text>
            <View style={styles.feeOptions}>
              <TouchableOpacity
                style={[styles.feeOption, feeRate === 'fast' && styles.feeOptionActive]}
                onPress={() => setFeeRate('fast')}
              >
                <Text style={styles.feeIcon}>🚀</Text>
                <Text style={[styles.feeTitle, feeRate === 'fast' && styles.feeTitleActive]}>Fast</Text>
                <Text style={styles.feeRate}>{fees.fast} sat/vB</Text>
                <Text style={styles.feeTime}>~10 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feeOption, feeRate === 'medium' && styles.feeOptionActive]}
                onPress={() => setFeeRate('medium')}
              >
                <Text style={styles.feeIcon}>⚡</Text>
                <Text style={[styles.feeTitle, feeRate === 'medium' && styles.feeTitleActive]}>Medium</Text>
                <Text style={styles.feeRate}>{fees.medium} sat/vB</Text>
                <Text style={styles.feeTime}>~30 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feeOption, feeRate === 'slow' && styles.feeOptionActive]}
                onPress={() => setFeeRate('slow')}
              >
                <Text style={styles.feeIcon}>🐢</Text>
                <Text style={[styles.feeTitle, feeRate === 'slow' && styles.feeTitleActive]}>Slow</Text>
                <Text style={styles.feeRate}>{fees.slow} sat/vB</Text>
                <Text style={styles.feeTime}>~1 hour</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Info */}
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>
              {(wallet?.balanceSats || 0).toLocaleString()} sats
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Send Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSend}
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
                  <Ionicons name="arrow-up" size={22} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Bitcoin</Text>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maxButton: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f7931a',
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
    fontSize: 15,
    color: '#fff',
    paddingVertical: 16,
    fontFamily: 'monospace',
  },
  scanButton: {
    padding: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    paddingVertical: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  amountPreview: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  feeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  feeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  feeOptionActive: {
    borderColor: '#f7931a',
    backgroundColor: 'rgba(247,147,26,0.1)',
  },
  feeIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  feeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
  },
  feeTitleActive: {
    color: '#f7931a',
  },
  feeRate: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 2,
  },
  feeTime: {
    fontSize: 10,
    color: '#666',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#888',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
});

