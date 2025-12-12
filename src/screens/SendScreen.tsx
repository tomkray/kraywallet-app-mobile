/**
 * Send Screen
 * KRAY OS Style - Black & White
 * With QR Code Scanner and Transaction Confirmation Modal
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
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import { TransactionConfirmModal, TransactionDetails } from '../components/TransactionConfirmModal';
import { WebQRScanner } from '../components/WebQRScanner';
import * as api from '../services/api';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SendScreenProps {
  onBack: () => void;
  onSuccess: (txid: string) => void;
}

export function SendScreen({ onBack, onSuccess }: SendScreenProps) {
  const { wallet, prepareBitcoinTx, sendBitcoin } = useWallet();
  
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  
  // Fee rates from mempool
  const [feeRates, setFeeRates] = useState<{
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
  } | null>(null);
  const [selectedFee, setSelectedFee] = useState<'slow' | 'normal' | 'fast' | 'custom'>('normal');
  const [customFee, setCustomFee] = useState('');
  const [loadingFees, setLoadingFees] = useState(true);
  
  // QR Scanner State
  const [showScanner, setShowScanner] = useState(false);
  
  // Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [psbtDetails, setPsbtDetails] = useState<api.PSBTDetails | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Load fee rates on mount
  useEffect(() => {
    loadFeeRates();
    // Refresh every 30 seconds
    const interval = setInterval(loadFeeRates, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFeeRates = async () => {
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
    return 10;
  };

  // Parse Bitcoin URI (BIP21)
  const parseBitcoinUri = (uri: string): { address: string; amount?: string } => {
    if (uri.startsWith('bc1') || uri.startsWith('1') || uri.startsWith('3') || uri.startsWith('tb1')) {
      return { address: uri };
    }
    
    if (uri.toLowerCase().startsWith('bitcoin:')) {
      const withoutScheme = uri.slice(8);
      const [addr, queryString] = withoutScheme.split('?');
      
      let parsedAmount: string | undefined;
      if (queryString) {
        const params = new URLSearchParams(queryString);
        const btcAmount = params.get('amount');
        if (btcAmount) {
          parsedAmount = String(Math.floor(parseFloat(btcAmount) * 100000000));
        }
      }
      
      return { address: addr, amount: parsedAmount };
    }
    
    return { address: uri };
  };

  // Handle QR scan
  const handleQRScan = (data: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    const { address: scannedAddress, amount: scannedAmount } = parseBitcoinUri(data);
    setAddress(scannedAddress);
    if (scannedAmount) {
      setAmount(scannedAmount);
    }
  };

  // Prepare transaction and show confirmation
  const handleReview = async () => {
    setError('');
    
    if (!address || !amount) {
      setError('Please fill in all fields');
      return;
    }
    
    const amountSats = parseInt(amount);
    if (isNaN(amountSats) || amountSats <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (amountSats > (wallet?.balanceSats || 0)) {
      setError('Insufficient balance');
      return;
    }
    
    setIsPreparing(true);
    
    try {
      const feeRate = getCurrentFeeRate();
      
      // Prepare the transaction (create PSBT)
      const psbt = await prepareBitcoinTx(address, amountSats, feeRate);
      setPsbtDetails(psbt);
      
      // Set transaction details for confirm modal
      setTransactionDetails({
        type: 'btc',
        toAddress: address,
        amount: amountSats,
        amountDisplay: `${amountSats.toLocaleString()} sats`,
        psbt: {
          inputs: psbt.inputs,
          outputs: psbt.outputs,
          fee: psbt.fee,
          feeRate: psbt.feeRate,
          virtualSize: psbt.virtualSize,
        },
      });
      
      setShowConfirmModal(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: any) {
      setError(err.message || 'Failed to prepare transaction');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPreparing(false);
    }
  };

  // Confirm and send transaction
  const handleConfirmSend = async (password: string, feeRate: number): Promise<string> => {
    const amountSats = parseInt(amount);
    const txid = await sendBitcoin(address, amountSats, feeRate, password);
    
    // Success - close modal and navigate back
    setTimeout(() => {
      onSuccess(txid);
    }, 2000);
    
    return txid;
  };

  const formatBalance = (sats: number) => sats.toLocaleString();

  const estimateFee = () => {
    if (!wallet?.utxos || wallet.utxos.length === 0) return 0;
    const estimatedVsize = Math.ceil((wallet.utxos.length * 68 + 2 * 34 + 10) / 4);
    return getCurrentFeeRate() * estimatedVsize;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Bitcoin</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>AVAILABLE</Text>
            <Text style={styles.balanceAmount}>
              {formatBalance(wallet?.balanceSats || 0)} sats
            </Text>
          </View>

          {/* Address Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>RECIPIENT ADDRESS</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="bc1q..."
                placeholderTextColor={colors.textMuted}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
                <Ionicons name="scan" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>AMOUNT (SATS)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <TouchableOpacity 
                style={styles.maxButton}
                onPress={() => {
                  const fee = estimateFee();
                  const maxAmount = Math.max(0, (wallet?.balanceSats || 0) - fee - 1000);
                  setAmount(String(maxAmount));
                }}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fee Selection */}
          <View style={styles.inputSection}>
            <View style={styles.feeHeader}>
              <Text style={styles.label}>NETWORK FEE</Text>
              {loadingFees ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <View style={styles.mempoolBadge}>
                  <Ionicons name="pulse" size={12} color={colors.success} />
                  <Text style={styles.mempoolText}>Live</Text>
                </View>
              )}
            </View>
            
            <View style={styles.feeSelector}>
              {(['slow', 'normal', 'fast'] as const).map((fee) => {
                const rate = feeRates 
                  ? fee === 'fast' ? feeRates.fastestFee 
                    : fee === 'slow' ? feeRates.hourFee 
                    : feeRates.halfHourFee
                  : fee === 'fast' ? 20 : fee === 'slow' ? 5 : 10;
                
                const time = fee === 'fast' ? '~10m' : fee === 'slow' ? '~60m' : '~30m';
                
                return (
                  <TouchableOpacity
                    key={fee}
                    style={[styles.feeOption, selectedFee === fee && styles.feeOptionActive]}
                    onPress={() => setSelectedFee(fee)}
                  >
                    <Text style={[styles.feeOptionTitle, selectedFee === fee && styles.feeOptionTitleActive]}>
                      {fee.charAt(0).toUpperCase() + fee.slice(1)}
                    </Text>
                    <Text style={[styles.feeOptionRate, selectedFee === fee && styles.feeOptionRateActive]}>
                      {rate} sat/vB
                    </Text>
                    <Text style={styles.feeOptionTime}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Fee */}
            <TouchableOpacity
              style={[styles.customFeeRow, selectedFee === 'custom' && styles.customFeeRowActive]}
              onPress={() => setSelectedFee('custom')}
            >
              <Text style={[styles.customFeeLabel, selectedFee === 'custom' && styles.customFeeLabelActive]}>
                Custom Fee
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
          </View>

          {/* Estimated Fee */}
          {amount && parseInt(amount) > 0 && (
            <View style={styles.estimateBox}>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Amount</Text>
                <Text style={styles.estimateValue}>{parseInt(amount).toLocaleString()} sats</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Est. Network Fee</Text>
                <Text style={styles.estimateValue}>~{estimateFee().toLocaleString()} sats</Text>
              </View>
              <View style={[styles.estimateRow, styles.estimateTotal]}>
                <Text style={styles.estimateTotalLabel}>Total</Text>
                <Text style={styles.estimateTotalValue}>
                  ~{(parseInt(amount) + estimateFee()).toLocaleString()} sats
                </Text>
              </View>
            </View>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Review Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendButton, isPreparing && styles.sendButtonDisabled]}
            onPress={handleReview}
            disabled={isPreparing}
            activeOpacity={0.8}
          >
            {isPreparing ? (
              <ActivityIndicator color={colors.buttonPrimaryText} />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color={colors.buttonPrimaryText} />
                <Text style={styles.sendButtonText}>Review Transaction</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Transaction Confirm Modal */}
      <TransactionConfirmModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSend}
        transaction={transactionDetails}
        walletAddress={wallet?.address}
      />

      {/* QR Scanner */}
      <WebQRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        title="Scan Address"
        hint="Point your camera at a Bitcoin address QR code"
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mempoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mempoolText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 16,
  },
  scanButton: {
    padding: 8,
  },
  maxButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  feeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  feeOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  feeOptionActive: {
    borderColor: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  feeOptionTitle: {
    fontSize: 12,
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
  feeOptionRateActive: {
    color: colors.textPrimary,
  },
  feeOptionTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  customFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    paddingVertical: 14,
    minWidth: 100,
  },
  estimateBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  estimateLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  estimateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  estimateTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  estimateTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  estimateTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.error,
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  // QR Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scannerPlaceholder: {
    width: 44,
  },
  scannerFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scannerInfo: {
    alignItems: 'center',
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 20,
  },
  scannerInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  scannerInfoSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
