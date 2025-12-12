/**
 * Transaction Confirmation Modal
 * Standard signing flow with password verification, PSBT details, and fee selection
 * Used across all wallet send operations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as api from '../services/api';
import colors from '../theme/colors';

// Transaction type
export type TransactionType = 'btc' | 'ordinal' | 'rune' | 'l2-transfer' | 'l2-swap' | 'l2-withdraw';

// Fee rates from mempool
interface FeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

// PSBT details
interface PSBTDetails {
  inputs: Array<{
    txid: string;
    vout: number;
    value: number;
    address?: string;
  }>;
  outputs: Array<{
    address: string;
    value: number;
  }>;
  fee: number;
  feeRate: number;
  virtualSize: number;
}

// Transaction details passed to modal
export interface TransactionDetails {
  type: TransactionType;
  // Common fields
  toAddress: string;
  amount: number; // in sats for BTC, or token amount
  amountDisplay: string; // formatted for display
  asset?: string; // token name or inscription ID
  // For BTC transactions
  psbt?: PSBTDetails;
  // For L2 transactions
  l2Details?: {
    token: string;
    estimatedTime: string;
    isFree?: boolean;
  };
}

interface TransactionConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string, feeRate: number) => Promise<string>; // Returns txid
  transaction: TransactionDetails | null;
  walletAddress?: string;
}

export function TransactionConfirmModal({
  visible,
  onClose,
  onConfirm,
  transaction,
  walletAddress,
}: TransactionConfirmModalProps) {
  // State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [feeRates, setFeeRates] = useState<FeeRates | null>(null);
  const [selectedFee, setSelectedFee] = useState<'slow' | 'normal' | 'fast' | 'custom'>('normal');
  const [customFee, setCustomFee] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [successTxid, setSuccessTxid] = useState<string | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [copiedTxid, setCopiedTxid] = useState(false);
  
  // Animation
  const [slideAnim] = useState(new Animated.Value(0));

  // Load fee rates when modal opens
  useEffect(() => {
    if (visible && transaction?.type === 'btc') {
      loadFeeRates();
    }
  }, [visible, transaction?.type]);

  // Reset state when closing
  useEffect(() => {
    if (!visible) {
      setPassword('');
      setError('');
      setSuccessTxid(null);
      setSelectedFee('normal');
      setCustomFee('');
      setCopiedTxid(false);
    }
  }, [visible]);

  const loadFeeRates = async () => {
    setLoadingFees(true);
    try {
      const rates = await api.getFeeRates();
      setFeeRates(rates);
    } catch (err) {
      console.error('Failed to load fee rates:', err);
    } finally {
      setLoadingFees(false);
    }
  };

  const getCurrentFeeRate = (): number => {
    if (selectedFee === 'custom' && customFee) {
      return parseInt(customFee);
    }
    if (feeRates) {
      switch (selectedFee) {
        case 'fast': return feeRates.fastestFee;
        case 'slow': return feeRates.hourFee;
        default: return feeRates.halfHourFee;
      }
    }
    // Fallback defaults
    return selectedFee === 'fast' ? 20 : selectedFee === 'slow' ? 5 : 10;
  };

  const handleConfirm = async () => {
    if (!password) {
      setError('Please enter your password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsConfirming(true);
    setError('');
    
    try {
      const txid = await onConfirm(password, getCurrentFeeRate());
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessTxid(txid);
      
      // DON'T auto close - let user see the success screen with links
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsConfirming(false);
    }
  };

  // Copy TXID to clipboard
  const copyTxid = async () => {
    if (successTxid) {
      await Clipboard.setStringAsync(successTxid);
      setCopiedTxid(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopiedTxid(false), 2000);
    }
  };

  // Open in explorer
  const openInMempool = () => {
    if (successTxid) {
      Linking.openURL(`https://mempool.space/tx/${successTxid}`);
    }
  };

  const openInKrayScan = () => {
    if (successTxid) {
      Linking.openURL(`https://kray.space/krayscan.html?txid=${successTxid}`);
    }
  };

  const formatAddress = (addr: string, chars: number = 8) => {
    if (!addr || addr.length < chars * 2) return addr;
    return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
  };

  const formatSats = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  const isL2Transaction = transaction?.type?.startsWith('l2');

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons 
                name={isL2Transaction ? "flash" : "shield-checkmark"} 
                size={24} 
                color={colors.textPrimary} 
              />
            </View>
            <Text style={styles.headerTitle}>
              {isL2Transaction ? '⚡ Confirm Transaction' : '🔐 Sign Transaction'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Transaction Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>SENDING</Text>
              <Text style={styles.summaryAmount}>{transaction.amountDisplay}</Text>
              {transaction.asset && (
                <Text style={styles.summaryAsset}>{transaction.asset}</Text>
              )}
            </View>

            {/* To Address */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>TO</Text>
              <View style={styles.addressBox}>
                <Ionicons name="wallet" size={16} color={colors.textMuted} />
                <Text style={styles.addressText}>{formatAddress(transaction.toAddress, 12)}</Text>
              </View>
            </View>

            {/* PSBT Details (for mainnet BTC transactions) */}
            {transaction.psbt && (
              <View style={styles.psbtSection}>
                <Text style={styles.sectionTitle}>📋 TRANSACTION DETAILS</Text>
                
                {/* Inputs */}
                <View style={styles.psbtGroup}>
                  <Text style={styles.psbtGroupTitle}>INPUTS ({transaction.psbt.inputs.length})</Text>
                  {transaction.psbt.inputs.map((input, i) => (
                    <View key={i} style={styles.utxoRow}>
                      <View style={styles.utxoLeft}>
                        <Text style={styles.utxoTxid}>{formatAddress(input.txid, 6)}:{input.vout}</Text>
                      </View>
                      <Text style={styles.utxoValue}>{formatSats(input.value)}</Text>
                    </View>
                  ))}
                </View>

                {/* Outputs */}
                <View style={styles.psbtGroup}>
                  <Text style={styles.psbtGroupTitle}>OUTPUTS ({transaction.psbt.outputs.length})</Text>
                  {transaction.psbt.outputs.map((output, i) => (
                    <View key={i} style={styles.utxoRow}>
                      <View style={styles.utxoLeft}>
                        <Text style={styles.utxoTxid}>
                          {output.address === walletAddress ? '(Change)' : formatAddress(output.address, 8)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.utxoValue,
                        output.address !== walletAddress && styles.utxoValueSend
                      ]}>
                        {formatSats(output.value)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Fee Info */}
                <View style={styles.feeInfo}>
                  <View style={styles.feeInfoRow}>
                    <Text style={styles.feeInfoLabel}>Network Fee</Text>
                    <Text style={styles.feeInfoValue}>{formatSats(transaction.psbt.fee)}</Text>
                  </View>
                  <View style={styles.feeInfoRow}>
                    <Text style={styles.feeInfoLabel}>Size</Text>
                    <Text style={styles.feeInfoValue}>{transaction.psbt.virtualSize} vB</Text>
                  </View>
                  <View style={styles.feeInfoRow}>
                    <Text style={styles.feeInfoLabel}>Rate</Text>
                    <Text style={styles.feeInfoValue}>{transaction.psbt.feeRate} sat/vB</Text>
                  </View>
                </View>
              </View>
            )}

            {/* L2 Details */}
            {isL2Transaction && transaction.l2Details && (
              <View style={styles.l2Section}>
                <View style={styles.l2Row}>
                  <Text style={styles.l2Label}>Token</Text>
                  <Text style={styles.l2Value}>{transaction.l2Details.token}</Text>
                </View>
                <View style={styles.l2Row}>
                  <Text style={styles.l2Label}>Speed</Text>
                  <Text style={styles.l2ValueSuccess}>⚡ {transaction.l2Details.estimatedTime}</Text>
                </View>
                {transaction.l2Details.isFree && (
                  <View style={styles.l2Free}>
                    <Ionicons name="gift" size={16} color={colors.success} />
                    <Text style={styles.l2FreeText}>Free Transaction (membership perk)</Text>
                  </View>
                )}
              </View>
            )}

            {/* Fee Selection (for mainnet transactions) */}
            {!isL2Transaction && (
              <View style={styles.feeSection}>
                <Text style={styles.sectionTitle}>⛽ NETWORK FEE</Text>
                
                {loadingFees ? (
                  <View style={styles.loadingFees}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={styles.loadingFeesText}>Loading mempool fees...</Text>
                  </View>
                ) : (
                  <>
                    {/* Fee Options */}
                    <View style={styles.feeOptions}>
                      {(['slow', 'normal', 'fast'] as const).map((option) => {
                        const rate = feeRates 
                          ? option === 'fast' ? feeRates.fastestFee 
                            : option === 'slow' ? feeRates.hourFee 
                            : feeRates.halfHourFee
                          : option === 'fast' ? 20 : option === 'slow' ? 5 : 10;
                        
                        const time = option === 'fast' ? '~10 min' 
                          : option === 'slow' ? '~60 min' 
                          : '~30 min';
                        
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.feeOption,
                              selectedFee === option && styles.feeOptionActive
                            ]}
                            onPress={() => setSelectedFee(option)}
                          >
                            <Text style={[
                              styles.feeOptionTitle,
                              selectedFee === option && styles.feeOptionTitleActive
                            ]}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                            <Text style={styles.feeOptionRate}>{rate} sat/vB</Text>
                            <Text style={styles.feeOptionTime}>{time}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Custom Fee */}
                    <TouchableOpacity
                      style={[
                        styles.customFeeRow,
                        selectedFee === 'custom' && styles.customFeeRowActive
                      ]}
                      onPress={() => setSelectedFee('custom')}
                    >
                      <Text style={[
                        styles.customFeeLabel,
                        selectedFee === 'custom' && styles.customFeeLabelActive
                      ]}>
                        Custom
                      </Text>
                      <TextInput
                        style={styles.customFeeInput}
                        placeholder="sat/vB"
                        placeholderTextColor={colors.textMuted}
                        value={customFee}
                        onChangeText={(val) => {
                          setCustomFee(val);
                          setSelectedFee('custom');
                        }}
                        keyboardType="numeric"
                      />
                    </TouchableOpacity>

                    {/* Mempool Status */}
                    {feeRates && (
                      <View style={styles.mempoolStatus}>
                        <Ionicons name="pulse" size={14} color={colors.success} />
                        <Text style={styles.mempoolText}>
                          Mempool: {feeRates.minimumFee}-{feeRates.fastestFee} sat/vB
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Password Input */}
            <View style={styles.passwordSection}>
              <Text style={styles.sectionTitle}>🔑 ENTER PASSWORD TO SIGN</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Your wallet password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Success Screen */}
          {successTxid ? (
            <View style={styles.successScreen}>
              {/* Success Icon */}
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
              </View>
              
              <Text style={styles.successTitle}>🎉 Transaction Broadcast!</Text>
              <Text style={styles.successSubtitle}>Your transaction is being confirmed</Text>
              
              {/* TXID */}
              <View style={styles.txidContainer}>
                <Text style={styles.txidLabel}>TRANSACTION ID</Text>
                <TouchableOpacity style={styles.txidBox} onPress={copyTxid}>
                  <Text style={styles.txidText} numberOfLines={1}>
                    {successTxid}
                  </Text>
                  <Ionicons 
                    name={copiedTxid ? "checkmark" : "copy"} 
                    size={18} 
                    color={copiedTxid ? colors.success : colors.textMuted} 
                  />
                </TouchableOpacity>
                {copiedTxid && (
                  <Text style={styles.copiedText}>Copied to clipboard!</Text>
                )}
              </View>

              {/* Explorer Links */}
              <View style={styles.explorerLinks}>
                <TouchableOpacity style={styles.explorerButton} onPress={openInMempool}>
                  <Ionicons name="globe-outline" size={20} color={colors.textPrimary} />
                  <Text style={styles.explorerButtonText}>mempool.space</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.explorerButton} onPress={openInKrayScan}>
                  <Ionicons name="search" size={20} color={colors.textPrimary} />
                  <Text style={styles.explorerButtonText}>KrayScan</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Done Button */}
              <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Confirm Button */
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator color={colors.buttonPrimaryText} />
                ) : (
                  <>
                    <Ionicons 
                      name={isL2Transaction ? "flash" : "finger-print"} 
                      size={22} 
                      color={colors.buttonPrimaryText} 
                    />
                    <Text style={styles.confirmButtonText}>
                      {isL2Transaction ? 'Confirm & Send' : 'Sign & Broadcast'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                {isL2Transaction 
                  ? 'This action cannot be undone'
                  : 'Your transaction will be broadcast to the Bitcoin network'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryAsset: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
  // PSBT Section
  psbtSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  psbtGroup: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  psbtGroupTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  utxoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  utxoLeft: {
    flex: 1,
  },
  utxoTxid: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textMuted,
  },
  utxoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  utxoValueSend: {
    color: colors.error,
  },
  feeInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
  },
  feeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feeInfoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  feeInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // L2 Section
  l2Section: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  l2Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  l2Label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  l2Value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  l2ValueSuccess: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  l2Free: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  l2FreeText: {
    fontSize: 12,
    color: colors.success,
  },
  // Fee Section
  feeSection: {
    marginBottom: 20,
  },
  loadingFees: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  loadingFeesText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  feeOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  feeOption: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  feeOptionActive: {
    borderColor: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  feeOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  feeOptionTitleActive: {
    color: colors.textPrimary,
  },
  feeOptionRate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  feeOptionTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  customFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
  },
  customFeeRowActive: {
    borderColor: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  customFeeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  customFeeLabelActive: {
    color: colors.textPrimary,
  },
  customFeeInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    paddingVertical: 12,
    minWidth: 100,
  },
  mempoolStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mempoolText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // Password Section
  passwordSection: {
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 16,
  },
  passwordToggle: {
    padding: 8,
  },
  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
  },
  // Success Screen
  successScreen: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  txidContainer: {
    width: '100%',
    marginBottom: 24,
  },
  txidLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  txidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  txidText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textPrimary,
  },
  copiedText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 8,
    textAlign: 'center',
  },
  explorerLinks: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  explorerButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  doneButton: {
    width: '100%',
    backgroundColor: colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  // Footer
  footer: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 14,
    paddingVertical: 18,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.buttonPrimaryText,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});

