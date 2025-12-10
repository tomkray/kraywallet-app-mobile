/**
 * Runes Tab Component
 * Display user's runes with Transfer functionality
 * KRAY OS Style - Same as extension production
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Rune {
  id: string;
  name: string;
  symbol: string;
  balance?: number;
  amount?: string;
  rawAmount?: number;
  divisibility: number;
  formattedAmount?: string;
  thumbnail?: string;
  etching?: string;
  // UTXOs needed for send transactions (from QuickNode backend)
  utxos?: Array<{ txid: string; vout: number; amount: number }>;
  runeId?: string;
}

interface RunesTabProps {
  runes: Rune[];
  walletAddress?: string;
  onTransfer?: (rune: Rune, toAddress: string, amount: string, password: string) => Promise<string>;
}

export function RunesTab({ runes, walletAddress, onTransfer }: RunesTabProps) {
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedRune, setSelectedRune] = useState<Rune | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [successTxid, setSuccessTxid] = useState<string | null>(null);
  const [copiedTxid, setCopiedTxid] = useState(false);
  
  // QR Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  if (runes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>◆</Text>
        <Text style={styles.emptyTitle}>No Runes</Text>
        <Text style={styles.emptyText}>
          Your Runes tokens will appear here
        </Text>
        
        {/* Create Rune Button */}
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.createButtonText}>Etch New Rune</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatBalance = (balance: number | undefined, divisibility: number, formattedAmount?: string) => {
    if (formattedAmount) return formattedAmount;
    if (!balance) return '0';
    return (balance / Math.pow(10, divisibility)).toLocaleString(undefined, {
      maximumFractionDigits: divisibility,
    });
  };

  // Open Transfer Modal
  const handleRunePress = (rune: Rune) => {
    setSelectedRune(rune);
    setTransferTo('');
    setTransferAmount('');
    setPassword('');
    setTransferError('');
    setSuccessTxid(null);
    setCopiedTxid(false);
    setShowTransferModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle Transfer
  const handleTransfer = async () => {
    if (!selectedRune) return;
    
    if (!transferTo) {
      setTransferError('Please enter a recipient address');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter a valid amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (!password) {
      setTransferError('Please enter your password to sign');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setIsTransferring(true);
    setTransferError('');
    
    try {
      if (onTransfer) {
        console.log('📤 Starting rune transfer...');
        console.log('  Rune:', selectedRune.name);
        console.log('  To:', transferTo);
        console.log('  Amount:', transferAmount);
        
        const txid = await onTransfer(selectedRune, transferTo, transferAmount, password);
        console.log('✅ Rune transfer result txid:', txid);
        
        if (txid) {
          setSuccessTxid(txid);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPassword(''); // Clear password
        } else {
          setTransferError('Transaction sent but no TXID returned. Check Activity tab.');
        }
        // DON'T auto-close - let user see success screen
      } else {
        setTransferError('Transfer handler not available');
      }
    } catch (error: any) {
      console.error('❌ Rune transfer error:', error);
      setTransferError(error.message || 'Transfer failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsTransferring(false);
    }
  };

  // Copy TXID
  const copyTxid = async () => {
    if (successTxid) {
      await Clipboard.setStringAsync(successTxid);
      setCopiedTxid(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopiedTxid(false), 2000);
    }
  };

  // Close success and modal
  const handleDone = () => {
    setShowTransferModal(false);
    setSuccessTxid(null);
  };

  // Handle Max button
  const handleMaxAmount = () => {
    if (selectedRune) {
      const maxAmount = formatBalance(selectedRune.balance, selectedRune.divisibility || 0, selectedRune.formattedAmount);
      setTransferAmount(maxAmount.replace(/,/g, ''));
    }
  };

  // Open QR Scanner
  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setTransferError('Camera permission is required to scan QR codes');
        return;
      }
    }
    setShowScanner(true);
  };

  // Handle QR Scan
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Parse bitcoin: URI if present
    let address = data;
    if (data.toLowerCase().startsWith('bitcoin:')) {
      address = data.slice(8).split('?')[0];
    }
    
    setTransferTo(address);
    setShowScanner(false);
    setScanned(false);
  };

  const renderRune = ({ item }: { item: Rune }) => (
    <TouchableOpacity style={styles.runeItem} onPress={() => handleRunePress(item)}>
      <View style={styles.runeIcon}>
        {item.thumbnail ? (
          <Image 
            source={{ uri: item.thumbnail }} 
            style={styles.runeThumbnail}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.runeSymbol}>{item.symbol || '◆'}</Text>
        )}
      </View>
      <View style={styles.runeInfo}>
        <Text style={styles.runeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.runeBalance}>
          {formatBalance(item.balance, item.divisibility || 0, item.formattedAmount)} {item.symbol || ''}
        </Text>
      </View>
      <View style={styles.sendBadge}>
        <Ionicons name="arrow-up" size={14} color="#fff" />
        <Text style={styles.sendBadgeText}>Send</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Create Rune Button */}
      <TouchableOpacity style={styles.createButtonTop}>
        <Ionicons name="add" size={20} color="#000" />
        <Text style={styles.createButtonText}>Etch New Rune</Text>
      </TouchableOpacity>

      <FlatList
        data={runes}
        renderItem={renderRune}
        keyExtractor={(item) => item.id || item.name}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Send {selectedRune?.symbol || selectedRune?.name || 'Rune'}
              </Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Rune Info */}
            <View style={styles.runeInfoCard}>
              <View style={styles.runeIconLarge}>
                <Text style={styles.runeSymbolLarge}>{selectedRune?.symbol || '◆'}</Text>
              </View>
              <View>
                <Text style={styles.runeNameLarge}>{selectedRune?.name}</Text>
                <Text style={styles.runeBalanceLarge}>
                  Balance: {selectedRune && formatBalance(selectedRune.balance, selectedRune.divisibility || 0, selectedRune.formattedAmount)}
                </Text>
              </View>
            </View>

            {/* To Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECIPIENT ADDRESS</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="bc1p... or taproot address"
                  placeholderTextColor="#666"
                  value={transferTo}
                  onChangeText={setTransferTo}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
                  <Ionicons name="scan" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AMOUNT</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="0"
                  placeholderTextColor="#666"
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.maxButton} onPress={handleMaxAmount}>
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {transferError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{transferError}</Text>
              </View>
            ) : null}

            {/* SUCCESS SCREEN WITH LINKS */}
            {successTxid ? (
              <View style={styles.successScreen}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                <Text style={styles.successTitle}>Transaction Broadcast!</Text>
                <Text style={styles.successSubtitle}>Your runes are being transferred</Text>
                
                <Text style={styles.txidLabel}>TRANSACTION ID</Text>
                <View style={styles.txidBox}>
                  <Text style={styles.txidText}>{successTxid.slice(0, 20)}...{successTxid.slice(-8)}</Text>
                  <TouchableOpacity onPress={copyTxid} style={styles.copyTxidButton}>
                    <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.explorerButton}
                  onPress={() => Linking.openURL(`https://mempool.space/tx/${successTxid}`)}
                >
                  <Ionicons name="globe-outline" size={18} color="#fff" />
                  <Text style={styles.explorerText}>View on mempool.space</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.explorerButton}
                  onPress={() => Linking.openURL(`https://kray.space/krayscan.html?tx=${successTxid}`)}
                >
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <Text style={styles.explorerText}>View on KrayScan</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Password Input - only show if not success */}
            {!successTxid && (
            <View style={styles.passwordSection}>
              <Text style={styles.passwordLabel}>🔑 ENTER PASSWORD TO SIGN</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Your wallet password"
                  placeholderTextColor="#666"
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
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            )}

            {/* Transfer / Done Button */}
            <TouchableOpacity
              style={[styles.transferButton, isTransferring && styles.transferButtonDisabled]}
              onPress={successTxid ? handleDone : handleTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <ActivityIndicator color="#000" />
              ) : successTxid ? (
                <Text style={styles.transferButtonText}>✓ Done</Text>
              ) : (
                <>
                  <Ionicons name="finger-print" size={20} color="#000" />
                  <Text style={styles.transferButtonText}>Sign & Send Transfer</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Fee Note */}
            <Text style={styles.feeNote}>
              Network fee will be calculated based on current rates
            </Text>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          
          {/* Scanner Overlay */}
          <View style={styles.scannerOverlay}>
            <SafeAreaView style={styles.scannerHeader}>
              <TouchableOpacity 
                style={styles.scannerCloseButton}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Address</Text>
              <View style={{ width: 44 }} />
            </SafeAreaView>
            
            <View style={styles.scannerFrameContainer}>
              <View style={styles.scannerFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
            </View>
            
            <View style={styles.scannerInfo}>
              <Text style={styles.scannerInfoText}>
                Scan recipient's Bitcoin address
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  createButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  list: {
    paddingBottom: 20,
  },
  runeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  runeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  runeSymbol: {
    fontSize: 20,
    color: '#fff',
  },
  runeThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  runeInfo: {
    flex: 1,
  },
  runeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  runeBalance: {
    fontSize: 13,
    color: '#888',
  },
  sendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  runeInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  runeIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  runeSymbolLarge: {
    fontSize: 28,
    color: '#fff',
  },
  runeNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  runeBalanceLarge: {
    fontSize: 14,
    color: '#888',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  maxButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    flex: 1,
  },
  // Success Screen Styles
  successScreen: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  successTitle: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  successSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  txidLabel: {
    color: '#64748b',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  txidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,147,26,0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
  },
  txidText: {
    color: '#f7931a',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyTxidButton: {
    padding: 4,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
    width: '100%',
  },
  explorerText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  passwordSection: {
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 14,
  },
  passwordToggle: {
    padding: 8,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  transferButtonDisabled: {
    opacity: 0.5,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  feeNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  // Scanner styles
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
  },
});
