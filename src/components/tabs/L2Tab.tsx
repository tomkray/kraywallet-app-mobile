/**
 * L2 Tab Component
 * KRAY L2 features: deposit, withdraw, transfer, swap
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../../context/WalletContext';
import * as api from '../../services/api';
import { Image } from 'react-native';
import { WebQRScanner } from '../WebQRScanner';

// Check if running in web
const isWeb = Platform.OS === 'web';

// Token thumbnails/logos (from backend rune-thumbnail API)
const TOKEN_LOGOS: Record<string, string> = {
  'KRAY': 'https://kraywallet-backend.onrender.com/api/rune-thumbnail/parent/KRAY%E2%80%A2SPACE',
  'DOG': 'https://kraywallet-backend.onrender.com/api/rune-thumbnail/parent/DOG%E2%80%A2GO%E2%80%A2TO%E2%80%A2THE%E2%80%A2MOON',
  'DOGSOCIAL': 'https://kraywallet-backend.onrender.com/api/rune-thumbnail/parent/DOG%E2%80%A2SOCIAL%E2%80%A2CLUB',
  'RADIOLA': 'https://kraywallet-backend.onrender.com/api/rune-thumbnail/parent/RADIOLA%E2%80%A2MUSIC',
};

// Fallback symbols
const TOKEN_SYMBOLS: Record<string, string> = {
  'KRAY': '⧈',
  'DOG': '🐕',
  'DOGSOCIAL': '🎭',
  'RADIOLA': '🎵',
};

export function L2Tab() {
  const { l2, wallet, sendL2, withdrawL2, swapL2, refreshL2 } = useWallet();
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [copiedL2Address, setCopiedL2Address] = useState(false);
  
  // Transfer state
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferToken, setTransferToken] = useState('KRAY');
  const [transferPassword, setTransferPassword] = useState('');
  const [showTransferPassword, setShowTransferPassword] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccessTxid, setTransferSuccessTxid] = useState<string | null>(null);
  const [copiedTxid, setCopiedTxid] = useState(false);
  
  // Swap state
  const [swapFrom, setSwapFrom] = useState('KRAY');
  const [swapTo, setSwapTo] = useState('DOG');
  const [swapAmount, setSwapAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState('');
  const [swapSuccessTxid, setSwapSuccessTxid] = useState<string | null>(null);
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [bridgeAddress, setBridgeAddress] = useState('');
  const [copiedBridge, setCopiedBridge] = useState(false);
  
  // Withdraw state (endereço é FIXO = wallet.address - igual extension)
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccessTxid, setWithdrawSuccessTxid] = useState<string | null>(null);
  
  // Fee rate selection (igual extension)
  const [feeRates, setFeeRates] = useState({ low: 10, medium: 20, high: 30 });
  const [selectedFeeRate, setSelectedFeeRate] = useState<'low' | 'medium' | 'high'>('medium');
  
  // UTXO selection for fee (igual extension)
  const [cleanUtxos, setCleanUtxos] = useState<api.FeeUtxo[]>([]);
  const [selectedUtxo, setSelectedUtxo] = useState<api.FeeUtxo | null>(null);
  const [loadingUtxos, setLoadingUtxos] = useState(false);
  
  // L2 Fee based on membership (igual extension)
  const [l2Fee, setL2Fee] = useState(1);
  
  // Withdraw progress steps (igual extension)
  const [withdrawStep, setWithdrawStep] = useState(0); // 0=idle, 1=signing, 2=creating_psbt, 3=signing_psbt, 4=submitting
  
  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Transaction history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Copy TXID helper
  const copyTxid = async (txid: string) => {
    await Clipboard.setStringAsync(txid);
    setCopiedTxid(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setCopiedTxid(false), 2000);
  };

  // Handle QR scan result
  const handleQRScan = (address: string) => {
    setTransferTo(address);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Handle Swap
  const handleSwap = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setSwapError('Please enter a valid amount');
      return;
    }
    
    if (swapFrom === swapTo) {
      setSwapError('Cannot swap same token');
      return;
    }
    
    setIsSwapping(true);
    setSwapError('');
    setSwapSuccessTxid(null);
    
    try {
      const txHash = await swapL2(swapFrom, swapTo, parseFloat(swapAmount));
      
      setSwapSuccessTxid(txHash);
      console.log('✅ L2 Swap TX:', txHash);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Refresh L2 data
      refreshL2();
      
      // DON'T auto-close - let user see success screen
    } catch (error: any) {
      setSwapError(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwapDone = () => {
    setShowSwapModal(false);
    setSwapSuccessTxid(null);
    setSwapAmount('');
  };

  // Load fee rates when withdraw modal opens (igual extension)
  const loadFeeRates = async () => {
    try {
      const rates = await api.getWithdrawalFeeRates();
      setFeeRates(rates);
      console.log('⛽ Fee rates:', rates);
    } catch (error) {
      console.warn('Failed to load fee rates, using defaults');
    }
  };
  
  // Load clean UTXOs for fee payment (igual extension)
  const loadCleanUtxos = async () => {
    if (!wallet?.address) return;
    setLoadingUtxos(true);
    try {
      const utxos = await api.getCleanUtxos(wallet.address);
      setCleanUtxos(utxos);
      
      // Auto-select first UTXO with enough sats
      const neededSats = api.calculateWithdrawalFeeSats(feeRates[selectedFeeRate]);
      const validUtxo = utxos.find(u => u.value >= neededSats);
      if (validUtxo) {
        setSelectedUtxo(validUtxo);
        console.log('✅ Auto-selected UTXO:', validUtxo.txid + ':' + validUtxo.vout);
      }
    } catch (error) {
      console.error('Failed to load UTXOs:', error);
    } finally {
      setLoadingUtxos(false);
    }
  };
  
  // Calculate L2 fee based on membership
  const calculateL2Fee = () => {
    const tier = l2?.membership?.tier?.toLowerCase();
    switch (tier) {
      case 'diamond':
      case 'black': return 0;
      case 'gold': return 0.5;
      case 'amethyst': return 1;
      default: return 1;
    }
  };
  
  // Handle Withdraw - FULL PSBT FLOW (igual extension)
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(withdrawAmount) > (l2?.balanceKray ?? 0)) {
      setWithdrawError('Insufficient L2 balance');
      return;
    }
    
    if (!withdrawPassword) {
      setWithdrawError('Please enter your password');
      return;
    }
    
    if (!selectedUtxo) {
      setWithdrawError('No UTXO selected for fee. Please select a clean UTXO.');
      return;
    }
    
    // Check if UTXO has enough sats for fee
    const neededSats = api.calculateWithdrawalFeeSats(feeRates[selectedFeeRate]);
    if (selectedUtxo.value < neededSats) {
      setWithdrawError(`Selected UTXO (${selectedUtxo.value} sats) is less than required fee (${neededSats} sats)`);
      return;
    }
    
    setIsWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccessTxid(null);
    
    try {
      // Step 1: Signing L2 message
      setWithdrawStep(1);
      
      const amount = parseFloat(withdrawAmount);
      const currentL2Fee = calculateL2Fee();
      
      console.log('📤 Starting L2 Withdrawal...');
      console.log('   Amount:', amount, 'KRAY');
      console.log('   L2 Fee:', currentL2Fee, 'KRAY');
      console.log('   Fee Rate:', feeRates[selectedFeeRate], 'sat/vB');
      console.log('   Fee UTXO:', selectedUtxo.txid + ':' + selectedUtxo.vout);
      
      // Call the full withdrawal flow
      setWithdrawStep(2); // Creating PSBT
      
      const withdrawalId = await withdrawL2({
        amount,
        password: withdrawPassword,
        feeRate: feeRates[selectedFeeRate],
        feeUtxo: selectedUtxo,
        l2Fee: currentL2Fee,
      });
      
      setWithdrawStep(4); // Done!
      
      setWithdrawSuccessTxid(withdrawalId);
      setWithdrawPassword('');
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Refresh L2 data
      refreshL2();
      
    } catch (error: any) {
      console.error('❌ Withdrawal error:', error);
      setWithdrawError(error.message || 'Withdrawal failed');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsWithdrawing(false);
      setWithdrawStep(0);
    }
  };

  const handleWithdrawDone = () => {
    setShowWithdrawModal(false);
    setWithdrawSuccessTxid(null);
    setWithdrawAmount('');
    setWithdrawPassword('');
    setWithdrawError('');
    setSelectedUtxo(null);
    setWithdrawStep(0);
  };
  
  // Open Withdraw Modal - load fees and UTXOs (igual extension)
  const openWithdrawModal = async () => {
    setShowWithdrawModal(true);
    setWithdrawError('');
    setWithdrawSuccessTxid(null);
    setL2Fee(calculateL2Fee());
    
    // Load fee rates and UTXOs in parallel
    await Promise.all([
      loadFeeRates(),
      loadCleanUtxos(),
    ]);
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter a valid address and amount');
      return;
    }
    
    if (!transferPassword) {
      setTransferError('Please enter your password');
      return;
    }
    
    // Validate Taproot address
    if (!transferTo.startsWith('bc1p') || transferTo.length !== 62) {
      setTransferError('Invalid address. Must be a bc1p... Taproot address');
      return;
    }
    
    setIsTransferring(true);
    setTransferError('');
    setTransferSuccessTxid(null);
    
    try {
      // Call real L2 transfer API with password for signing
      const txHash = await sendL2(transferTo, parseFloat(transferAmount), transferToken, transferPassword);
      
      setTransferSuccessTxid(txHash);
      console.log('✅ L2 Transfer TX:', txHash);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Clear password
      setTransferPassword('');
      
      // Refresh L2 data
      refreshL2();
      
      // DON'T auto-close - let user see success screen
    } catch (error: any) {
      setTransferError(error.message || 'Transfer failed');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleTransferDone = () => {
    setShowTransferModal(false);
    setTransferSuccessTxid(null);
    setTransferTo('');
    setTransferAmount('');
    setTransferPassword('');
    setTransferError('');
  };

  // Fetch bridge address when deposit modal opens
  const openDepositModal = async () => {
    setShowDepositModal(true);
    try {
      const address = await api.getBridgeDepositAddress();
      setBridgeAddress(address);
    } catch (error) {
      console.error('Error fetching bridge address:', error);
      setBridgeAddress('Error loading...');
    }
  };

  // Copy bridge address
  const copyBridgeAddress = async () => {
    if (bridgeAddress) {
      await Clipboard.setStringAsync(bridgeAddress);
      setCopiedBridge(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setTimeout(() => setCopiedBridge(false), 2000);
    }
  };

  const getMembershipBadge = (tier?: string) => {
    if (!tier) return { icon: '👤', color: '#888', name: 'No Card' };
    switch (tier.toLowerCase()) {
      case 'common': return { icon: '🪨', color: '#808080', name: 'Common' };
      case 'amethyst': return { icon: '💜', color: '#9966cc', name: 'Amethyst' };
      case 'gold': return { icon: '🥇', color: '#ffd700', name: 'Gold' };
      case 'diamond': return { icon: '💎', color: '#b9f2ff', name: 'Diamond' };
      case 'black': return { icon: '🖤', color: '#ffffff', name: 'Black' };
      default: return { icon: '👤', color: '#888', name: 'No Card' };
    }
  };

  const membership = getMembershipBadge(l2?.membership?.tier);

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* L2 Status Card with Deposit/Withdraw */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusIcon}>⚡</Text>
            <View>
              <Text style={styles.statusLabel}>KRAY SPACE</Text>
              <Text style={styles.statusTitle}>Layer 2</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, l2?.isConnected && styles.statusBadgeConnected]}>
            <View style={[styles.statusDot, l2?.isConnected && styles.statusDotConnected]} />
            <Text style={[styles.statusText, l2?.isConnected && styles.statusTextConnected]}>
              {l2?.isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Send & Receive Buttons - Compact (L2 Instant) */}
        <View style={styles.bridgeButtons}>
          <TouchableOpacity 
            style={styles.bridgeButton}
            onPress={() => setShowTransferModal(true)}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={styles.bridgeButtonText}>Send ⚡</Text>
          </TouchableOpacity>
          
          <View style={styles.bridgeDivider} />
          
          <TouchableOpacity 
            style={styles.bridgeButton}
            onPress={() => setShowReceiveModal(true)}
          >
            <Ionicons name="qr-code" size={18} color="#fff" />
            <Text style={styles.bridgeButtonText}>Receive ⚡</Text>
          </TouchableOpacity>
        </View>

        {/* Token Balances */}
        <View style={styles.balances}>
          <Text style={styles.balancesTitle}>Your Tokens</Text>
          
          <View style={styles.tokenRow}>
            <View style={styles.tokenLeft}>
              <View style={styles.tokenLogoContainer}>
                <Image 
                  source={{ uri: TOKEN_LOGOS.KRAY }}
                  style={styles.tokenLogo}
                  resizeMode="cover"
                />
              </View>
              <View>
                <Text style={styles.tokenName}>KRAY</Text>
                <Text style={styles.tokenSubname}>KRAY•SPACE</Text>
              </View>
            </View>
            <View style={styles.tokenRight}>
              <Text style={styles.tokenBalance}>{(l2?.balanceKray ?? 0).toLocaleString()} <Text style={styles.kraySymbol}>▽</Text></Text>
              <Text style={styles.tokenLabel}>Gas Token</Text>
            </View>
          </View>

          {(l2?.balanceDog ?? 0) > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <View style={styles.tokenLogoContainer}>
                  <Image 
                    source={{ uri: TOKEN_LOGOS.DOG }}
                    style={styles.tokenLogo}
                    resizeMode="cover"
                  />
                </View>
                <View>
                  <Text style={styles.tokenName}>DOG</Text>
                  <Text style={styles.tokenSubname}>DOG•GO•TO•THE•MOON</Text>
                </View>
              </View>
              <Text style={styles.tokenBalance}>{(l2?.balanceDog ?? 0).toLocaleString()}</Text>
            </View>
          )}

          {(l2?.balanceDogsocial ?? 0) > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <View style={styles.tokenLogoContainer}>
                  <Image 
                    source={{ uri: TOKEN_LOGOS.DOGSOCIAL }}
                    style={styles.tokenLogo}
                    resizeMode="cover"
                  />
                </View>
                <View>
                  <Text style={styles.tokenName}>DSC</Text>
                  <Text style={styles.tokenSubname}>DOG•SOCIAL•CLUB</Text>
                </View>
              </View>
              <Text style={styles.tokenBalance}>{(l2?.balanceDogsocial ?? 0).toLocaleString()}</Text>
            </View>
          )}

          {(l2?.balanceRadiola ?? 0) > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <View style={styles.tokenLogoContainer}>
                  <Image 
                    source={{ uri: TOKEN_LOGOS.RADIOLA }}
                    style={styles.tokenLogo}
                    resizeMode="cover"
                  />
                </View>
                <View>
                  <Text style={styles.tokenName}>RADIOLA</Text>
                  <Text style={styles.tokenSubname}>RADIOLA•MUSIC</Text>
                </View>
              </View>
              <Text style={styles.tokenBalance}>{(l2?.balanceRadiola ?? 0).toLocaleString()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Membership Card */}
      <View style={styles.membershipCard}>
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipTitle}>Membership</Text>
          <View style={[styles.membershipBadge, { backgroundColor: `${membership.color}20` }]}>
            <Text style={styles.membershipIcon}>{membership.icon}</Text>
            <Text style={[styles.membershipName, { color: membership.color }]}>{membership.name}</Text>
          </View>
        </View>

        {/* Free TX Counter */}
        <View style={styles.freeTxCard}>
          <View>
            <Text style={styles.freeTxLabel}>Free Transactions Today</Text>
            <Text style={styles.freeTxSubtext}>Resets at midnight UTC</Text>
          </View>
          <View style={styles.freeTxRight}>
            <Text style={styles.freeTxCount}>
              {l2?.membership?.usedToday ?? 0}/{l2?.membership?.freePerDay ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {/* L2 Transaction History - Preview (3 últimas) */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Recent Activity</Text>
          {(l2?.transactions?.length ?? 0) > 0 && (
            <TouchableOpacity 
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {(l2?.transactions?.length ?? 0) === 0 ? (
          <View style={styles.historyEmpty}>
            <Ionicons name="flash-outline" size={40} color="#444" />
            <Text style={styles.historyEmptyText}>No L2 transactions yet</Text>
            <Text style={styles.historyEmptySubtext}>Start using Layer 2 for instant transfers</Text>
          </View>
        ) : (
          (l2?.transactions ?? []).slice(0, 3).map((tx: any, index: number) => {
            const amount = parseInt(tx.amount) || 0;
            const isSent = tx.type === 'transfer' && tx.from === wallet?.address;
            const isDeposit = tx.type === 'deposit';
            const isWithdrawal = tx.type === 'withdrawal';
            const txHash = tx.tx_hash || tx.id || '';
            
            return (
              <TouchableOpacity 
                key={tx.id || index} 
                style={styles.historyItem}
                onPress={() => {
                  if (txHash) {
                    Linking.openURL(`https://kray.space/krayscan.html?l2tx=${txHash}`);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.historyLeft}>
                  <View style={[
                    styles.historyIcon,
                    isDeposit ? styles.historyIconDeposit :
                    isWithdrawal ? styles.historyIconWithdraw :
                    isSent ? styles.historyIconSent : styles.historyIconReceived
                  ]}>
                    <Ionicons 
                      name={
                        isDeposit ? "arrow-down" :
                        isWithdrawal ? "arrow-up" :
                        isSent ? "arrow-up" : "arrow-down"
                      } 
                      size={16} 
                      color="#fff" 
                    />
                  </View>
                  <View>
                    <Text style={styles.historyType}>
                      {isDeposit ? 'Deposit' :
                       isWithdrawal ? 'Withdrawal' :
                       isSent ? 'Sent' : 'Received'}
                    </Text>
                    <Text style={styles.historyTime}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[
                    styles.historyAmount,
                    isSent || isWithdrawal ? styles.historyAmountSent : styles.historyAmountReceived
                  ]}>
                    {isSent || isWithdrawal ? '-' : '+'}{amount.toLocaleString()} ▽
                  </Text>
                  <View style={styles.historyStatusRow}>
                    <Text style={styles.historyStatus}>{tx.status || 'confirmed'}</Text>
                    <Ionicons name="open-outline" size={12} color="#666" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Bottom padding for the fixed bar */}
      <View style={{ height: 70 }} />

      {/* Pending Withdrawals */}
      {(l2?.pendingWithdrawals?.length ?? 0) > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>⏳ Pending Withdrawals</Text>
          {(l2?.pendingWithdrawals ?? []).map((withdrawal, index) => (
            <View key={index} style={styles.pendingItem}>
              <View style={styles.pendingLeft}>
                <Text style={styles.pendingAmount}>{withdrawal.amount} ▽</Text>
                <Text style={styles.pendingStatus}>{withdrawal.status}</Text>
              </View>
              <Text style={styles.pendingTime}>~10 min</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />

      {/* L2 Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>L2 Transfer</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Send tokens instantly on KRAY L2</Text>
            
            {/* Token Selector - Horizontal Scroll with Thumbnails */}
            <Text style={styles.inputLabel}>Select Token</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tokenScrollContainer}
              contentContainerStyle={styles.tokenScrollContent}
            >
              {/* Only show tokens with balance > 0 */}
              {[
                { id: 'KRAY', name: 'KRAY', balance: l2?.balanceKray ?? 0 },
                { id: 'DOG', name: 'DOG', balance: l2?.balanceDog ?? 0 },
                { id: 'DOGSOCIAL', name: 'DSC', balance: l2?.balanceDogsocial ?? 0 },
                { id: 'RADIOLA', name: 'RADIOLA', balance: l2?.balanceRadiola ?? 0 },
              ].filter(t => t.balance > 0).map(token => (
                <TouchableOpacity
                  key={token.id}
                  style={[
                    styles.tokenCard, 
                    transferToken === token.id && styles.tokenCardActive
                  ]}
                  onPress={() => setTransferToken(token.id)}
                >
                  <Image 
                    source={{ uri: TOKEN_LOGOS[token.id] }} 
                    style={styles.tokenCardImage}
                  />
                  <View style={styles.tokenCardInfo}>
                    <Text style={[
                      styles.tokenCardName,
                      transferToken === token.id && styles.tokenCardNameActive
                    ]}>
                      {token.name}
                    </Text>
                    <Text style={styles.tokenCardBalance}>
                      {token.balance.toLocaleString()}
                    </Text>
                  </View>
                  {transferToken === token.id && (
                    <View style={styles.tokenCardCheck}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Show message if no tokens */}
              {[l2?.balanceKray, l2?.balanceDog, l2?.balanceDogsocial, l2?.balanceRadiola]
                .filter(b => (b ?? 0) > 0).length === 0 && (
                <View style={styles.noTokensMessage}>
                  <Text style={styles.noTokensText}>No tokens in L2</Text>
                  <Text style={styles.noTokensSubtext}>Deposit first</Text>
                </View>
              )}
            </ScrollView>
            
            {/* To Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>To Address</Text>
              <View style={styles.addressInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="bc1p... or KRAY address"
                  placeholderTextColor="#666"
                  value={transferTo}
                  onChangeText={setTransferTo}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.scanButton}
                  onPress={() => setShowScanner(true)}
                >
                  <Ionicons name="scan" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.amountToken}>{transferToken}</Text>
              </View>
              <Text style={styles.balanceHint}>
                Balance: {transferToken === 'KRAY' ? `${(l2?.balanceKray ?? 0).toLocaleString()} ▽` : 
                         transferToken === 'DOG' ? (l2?.balanceDog ?? 0).toLocaleString() :
                         (l2?.balanceDogsocial ?? 0).toLocaleString()}
              </Text>
            </View>
            
            {/* Password */}
            {!transferSuccessTxid && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter password to sign"
                  placeholderTextColor="#666"
                  value={transferPassword}
                  onChangeText={setTransferPassword}
                  secureTextEntry={!showTransferPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowTransferPassword(!showTransferPassword)}
                >
                  <Ionicons 
                    name={showTransferPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            )}
            
            {/* Error/Success Messages */}
            {transferError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{transferError}</Text>
              </View>
            ) : null}
            
            {/* SUCCESS SCREEN - Beautiful confirmation */}
            {transferSuccessTxid ? (
              <View style={styles.successScreen}>
                {/* Success Animation */}
                <View style={styles.successIconContainer}>
                  <View style={styles.successIconGlow} />
                  <Ionicons name="flash" size={50} color="#f7931a" />
                </View>
                
                <Text style={styles.successTitle}>⚡ Instant Transfer!</Text>
                <Text style={styles.successSubtitle}>Your L2 transfer was confirmed in milliseconds</Text>
                
                {/* Transfer Summary */}
                <View style={styles.transferSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount</Text>
                    <Text style={styles.summaryValue}>{transferAmount} {transferToken}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>To</Text>
                    <Text style={styles.summaryValueSmall}>{transferTo.slice(0, 12)}...{transferTo.slice(-8)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fee</Text>
                    <Text style={styles.summaryValueGreen}>FREE ⚡</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Status</Text>
                    <Text style={styles.summaryValueGreen}>✓ Confirmed</Text>
                  </View>
                </View>
                
                <Text style={styles.txidLabel}>TRANSACTION HASH</Text>
                <View style={styles.txidBox}>
                  <Text style={styles.txidText}>{transferSuccessTxid.slice(0, 16)}...{transferSuccessTxid.slice(-8)}</Text>
                  <TouchableOpacity onPress={() => copyTxid(transferSuccessTxid)} style={styles.copyTxidButton}>
                    <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                  </TouchableOpacity>
                </View>
                
                {/* Explorer Links */}
                <View style={styles.explorerLinks}>
                  <TouchableOpacity 
                    style={styles.explorerButton}
                    onPress={() => Linking.openURL(`https://kray.space/krayscan.html?l2tx=${transferSuccessTxid}`)}
                  >
                    <Ionicons name="flash-outline" size={18} color="#fff" />
                    <Text style={styles.explorerText}>View on KrayScan</Text>
                    <Ionicons name="open-outline" size={14} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            
            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, isTransferring && styles.sendButtonDisabled]}
              onPress={transferSuccessTxid ? handleTransferDone : handleTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <ActivityIndicator color="#fff" />
              ) : transferSuccessTxid ? (
                <Text style={styles.sendButtonText}>✓ Done</Text>
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Instantly</Text>
                </>
              )}
            </TouchableOpacity>
            
            {!transferSuccessTxid && (
            <Text style={styles.feeNote}>
              ⚡ Free TX: {l2?.membership?.usedToday ?? 0}/{l2?.membership?.freePerDay ?? 0} used today
            </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* L2 Swap Modal */}
      <Modal
        visible={showSwapModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSwapModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>L2 Swap</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowSwapModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Exchange tokens on KRAY L2</Text>
            
            {/* From Token */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>From</Text>
              <View style={styles.swapRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={swapAmount}
                  onChangeText={setSwapAmount}
                  keyboardType="decimal-pad"
                />
                <View style={styles.swapTokenSelect}>
                  {['KRAY', 'DOG'].map(token => (
                    <TouchableOpacity
                      key={token}
                      style={[styles.swapTokenBtn, swapFrom === token && styles.swapTokenBtnActive]}
                      onPress={() => setSwapFrom(token)}
                    >
                      <Text style={styles.swapTokenText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            {/* Swap Arrow */}
            <View style={styles.swapArrow}>
              <Ionicons name="swap-vertical" size={24} color="#fff" />
            </View>
            
            {/* To Token */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>To</Text>
              <View style={styles.swapRow}>
                <Text style={styles.swapEstimate}>
                  ~{swapAmount ? (parseFloat(swapAmount) * (swapFrom === 'KRAY' ? 0.001 : 1000)).toFixed(4) : '0.00'}
                </Text>
                <View style={styles.swapTokenSelect}>
                  {['DOG', 'KRAY'].map(token => (
                    <TouchableOpacity
                      key={token}
                      style={[styles.swapTokenBtn, swapTo === token && styles.swapTokenBtnActive]}
                      onPress={() => setSwapTo(token)}
                    >
                      <Text style={styles.swapTokenText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            {/* Error/Success Messages */}
            {swapError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{swapError}</Text>
              </View>
            ) : null}
            
            {/* SUCCESS SCREEN */}
            {swapSuccessTxid ? (
              <View style={styles.successScreen}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                <Text style={styles.successTitle}>Swap Complete!</Text>
                <Text style={styles.successSubtitle}>Your tokens have been swapped</Text>
                
                <Text style={styles.txidLabel}>TRANSACTION HASH</Text>
                <View style={styles.txidBox}>
                  <Text style={styles.txidText}>{swapSuccessTxid.slice(0, 20)}...{swapSuccessTxid.slice(-8)}</Text>
                  <TouchableOpacity onPress={() => copyTxid(swapSuccessTxid)} style={styles.copyTxidButton}>
                    <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.explorerButton}
                  onPress={() => Linking.openURL(`https://kray.space/krayscan.html?txid=${swapSuccessTxid}`)}
                >
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <Text style={styles.explorerText}>View on KrayScan L2</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Swap Button */}
            <TouchableOpacity
              style={[styles.sendButton, isSwapping && styles.sendButtonDisabled]}
              onPress={swapSuccessTxid ? handleSwapDone : handleSwap}
              disabled={isSwapping}
            >
              {isSwapping ? (
                <ActivityIndicator color="#fff" />
              ) : swapSuccessTxid ? (
                <Text style={styles.sendButtonText}>✓ Done</Text>
              ) : (
                <>
                  <Ionicons name="swap-horizontal" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Swap Tokens</Text>
                </>
              )}
            </TouchableOpacity>
            
            {!swapSuccessTxid && (
            <Text style={styles.feeNote}>
              ⚡ Swaps are instant on KRAY L2
            </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* L2 Receive Modal - Show address + QR code */}
      <Modal
        visible={showReceiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receive on L2</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowReceiveModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Share your address to receive KRAY ▽ instantly
            </Text>
            
            {/* QR Code */}
            <View style={styles.receiveQrContainer}>
              {wallet?.address ? (
                <View style={styles.qrCodeBox}>
                  {/* Real QR Code using API */}
                  <View style={styles.qrImageContainer}>
                    {Platform.OS === 'web' ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.address}&bgcolor=ffffff&color=000000`}
                        style={{ width: 160, height: 160, borderRadius: 8 }}
                        alt="QR Code"
                      />
                    ) : (
                      <Ionicons name="qr-code" size={140} color="#000" />
                    )}
                  </View>
                </View>
              ) : (
                <ActivityIndicator size="large" color="#fff" />
              )}
            </View>
            
            {/* Address Display */}
            <View style={styles.receiveAddressSection}>
              <Text style={styles.receiveAddressLabel}>Your L2 Address</Text>
              <View style={styles.receiveAddressBox}>
                <Text style={styles.receiveAddressText} selectable numberOfLines={2}>
                  {wallet?.address || 'Loading...'}
                </Text>
                <TouchableOpacity 
                  style={styles.receiveCopyBtn}
                  onPress={async () => {
                    if (wallet?.address) {
                      await Clipboard.setStringAsync(wallet.address);
                      setCopiedL2Address(true);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setTimeout(() => setCopiedL2Address(false), 2000);
                    }
                  }}
                >
                  <View style={[styles.copyBtnInner, copiedL2Address && styles.copyBtnInnerSuccess]}>
                    <Ionicons 
                      name={copiedL2Address ? "checkmark" : "copy"} 
                      size={18} 
                      color={copiedL2Address ? "#10b981" : "#fff"} 
                    />
                    <Text style={[styles.copyBtnText, copiedL2Address && styles.copyBtnTextSuccess]}>
                      {copiedL2Address ? 'Copied!' : 'Copy'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Info Note */}
            <View style={styles.receiveNote}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.receiveNoteText}>
                L2 transfers are instant and free (based on your membership tier)
              </Text>
            </View>
            
            {/* Close Button */}
            <TouchableOpacity
              style={styles.receiveCloseBtn}
              onPress={() => setShowReceiveModal(false)}
            >
              <Text style={styles.receiveCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deposit Modal (igual extension) */}
      <Modal
        visible={showDepositModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDepositModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit to L2</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Send BTC to the bridge address to receive KRAY on L2</Text>
            
            <View style={styles.depositInfo}>
              <Text style={styles.depositLabel}>🏦 Bridge Address</Text>
              <View style={styles.depositAddressBox}>
                <Text style={styles.depositAddress} selectable numberOfLines={2}>
                  {bridgeAddress || 'Loading bridge address...'}
                </Text>
                <TouchableOpacity style={styles.copyBtn} onPress={copyBridgeAddress}>
                  <Ionicons name={copiedBridge ? "checkmark" : "copy"} size={18} color={copiedBridge ? "#10b981" : "#fff"} />
                </TouchableOpacity>
              </View>
              
              {/* QR Code - Padronizado */}
              {bridgeAddress && (
                <View style={styles.qrContainer}>
                  <Text style={styles.qrLabel}>Scan to deposit</Text>
                  <View style={styles.qrImageContainer}>
                    {Platform.OS === 'web' ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${bridgeAddress}&bgcolor=ffffff&color=000000`}
                        style={{ width: 160, height: 160, borderRadius: 8 }}
                        alt="QR Code"
                      />
                    ) : (
                      <Ionicons name="qr-code" size={140} color="#000" />
                    )}
                  </View>
                </View>
              )}
              
              <View style={styles.depositNote}>
                <Ionicons name="information-circle" size={16} color="#f7931a" />
                <Text style={styles.depositNoteText}>
                  Deposits typically arrive within 10-30 minutes after 1 confirmation.
                </Text>
              </View>
            </View>
            
            <View style={styles.rateInfo}>
              <Text style={styles.rateLabel}>Current Rate</Text>
              <Text style={styles.rateValue}>1 BTC = 100,000 KRAY</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal - FULL UI igual Extension */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw from L2</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Withdraw KRAY Runes to your L1 address</Text>
            
            {/* Progress Steps (during withdrawal) */}
            {isWithdrawing && withdrawStep > 0 && (
              <View style={styles.progressBox}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.progressText}>
                  {withdrawStep === 1 && '⏳ Signing L2 message...'}
                  {withdrawStep === 2 && '⏳ Creating withdrawal PSBT...'}
                  {withdrawStep === 3 && '⏳ Signing PSBT...'}
                  {withdrawStep === 4 && '⏳ Submitting to network...'}
                </Text>
              </View>
            )}
            
            {/* 🔒 SECURITY: Address is FIXED - igual extension */}
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={16} color="#10b981" />
              <Text style={styles.securityNoteText}>
                Withdrawal goes to your own address only
              </Text>
            </View>
            
            {/* Fixed Withdraw Address (não editável - igual extension) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🔒 Destination Address</Text>
              <View style={styles.fixedAddressBox}>
                <Text style={styles.fixedAddressText} numberOfLines={1}>
                  {wallet?.address || 'Loading...'}
                </Text>
                <Ionicons name="lock-closed" size={14} color="#10b981" />
              </View>
            </View>
            
            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (KRAY)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
                editable={!isWithdrawing && !withdrawSuccessTxid}
              />
              <Text style={styles.balanceHint}>
                Balance: {(l2?.balanceKray ?? 0).toLocaleString()} ▽
              </Text>
            </View>
            
            {/* Fee Rate Selector (igual extension) */}
            {!withdrawSuccessTxid && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>⛽ Network Fee Rate</Text>
              <View style={styles.feeRateSelector}>
                {(['low', 'medium', 'high'] as const).map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.feeRateOption,
                      selectedFeeRate === rate && styles.feeRateOptionSelected
                    ]}
                    onPress={() => setSelectedFeeRate(rate)}
                    disabled={isWithdrawing}
                  >
                    <Text style={[
                      styles.feeRateName,
                      selectedFeeRate === rate && styles.feeRateNameSelected
                    ]}>
                      {rate === 'low' ? '🐢 Slow' : rate === 'medium' ? '🚗 Medium' : '🚀 Fast'}
                    </Text>
                    <Text style={styles.feeRateValue}>
                      {feeRates[rate]} sat/vB
                    </Text>
                    <Text style={styles.feeRateSats}>
                      ~{api.calculateWithdrawalFeeSats(feeRates[rate]).toLocaleString()} sats
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            )}
            
            {/* UTXO Selector (igual extension) */}
            {!withdrawSuccessTxid && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UTXO for Fee Payment</Text>
              {loadingUtxos ? (
                <View style={styles.utxoLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.utxoLoadingText}>Loading UTXOs...</Text>
                </View>
              ) : cleanUtxos.length === 0 ? (
                <View style={styles.utxoEmpty}>
                  <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                  <Text style={styles.utxoEmptyText}>
                    No clean UTXOs available for fee. Deposit some BTC first.
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.utxoList}>
                  {cleanUtxos.map((utxo, index) => {
                    const isSelected = selectedUtxo?.txid === utxo.txid && selectedUtxo?.vout === utxo.vout;
                    const neededSats = api.calculateWithdrawalFeeSats(feeRates[selectedFeeRate]);
                    const hasEnough = utxo.value >= neededSats;
                    
                    return (
                      <TouchableOpacity
                        key={`${utxo.txid}:${utxo.vout}`}
                        style={[
                          styles.utxoItem,
                          isSelected && styles.utxoItemSelected,
                          !hasEnough && styles.utxoItemInsufficient
                        ]}
                        onPress={() => setSelectedUtxo(utxo)}
                        disabled={isWithdrawing || !hasEnough}
                      >
                        <Text style={styles.utxoTxid} numberOfLines={1}>
                          {utxo.txid.slice(0, 8)}...:{utxo.vout}
                        </Text>
                        <Text style={[
                          styles.utxoValue,
                          isSelected && styles.utxoValueSelected,
                          !hasEnough && styles.utxoValueInsufficient
                        ]}>
                          {utxo.value.toLocaleString()} sats
                        </Text>
                        {isSelected && (
                          <View style={styles.utxoCheck}>
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          </View>
                        )}
                        {!hasEnough && (
                          <Text style={styles.utxoInsufficientLabel}>Too small</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
            )}
            
            {/* Fee Summary */}
            {!withdrawSuccessTxid && (
            <View style={styles.feeSummary}>
              <View style={styles.feeSummaryRow}>
                <Text style={styles.feeSummaryLabel}>Network Fee (BTC)</Text>
                <Text style={styles.feeSummaryValue}>
                  ~{api.calculateWithdrawalFeeSats(feeRates[selectedFeeRate]).toLocaleString()} sats
                </Text>
              </View>
              <View style={styles.feeSummaryRow}>
                <Text style={styles.feeSummaryLabel}>L2 Fee</Text>
                <Text style={styles.feeSummaryValue}>{l2Fee} ▽</Text>
              </View>
              <View style={styles.feeSummaryDivider} />
              <View style={styles.feeSummaryRow}>
                <Text style={styles.feeSummaryLabelTotal}>You will receive (L1)</Text>
                <Text style={styles.feeSummaryValueTotal}>
                  {withdrawAmount ? Math.max(0, parseFloat(withdrawAmount) - l2Fee).toLocaleString() : '0'} ▽
                </Text>
              </View>
            </View>
            )}
            
            {/* Password (igual extension) */}
            {!withdrawSuccessTxid && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🔐 Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter password to sign"
                  placeholderTextColor="#666"
                  value={withdrawPassword}
                  onChangeText={setWithdrawPassword}
                  secureTextEntry={!showWithdrawPassword}
                  editable={!isWithdrawing}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowWithdrawPassword(!showWithdrawPassword)}
                >
                  <Ionicons 
                    name={showWithdrawPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            )}
            
            {/* Error/Success Messages */}
            {withdrawError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{withdrawError}</Text>
              </View>
            ) : null}
            
            {/* SUCCESS SCREEN */}
            {withdrawSuccessTxid ? (
              <View style={styles.successScreen}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                <Text style={styles.successTitle}>Withdrawal Signed!</Text>
                <Text style={styles.successSubtitle}>
                  Your KRAY ▽ is on the way to L1!
                </Text>
                
                {withdrawSuccessTxid !== 'pending' && (
                  <>
                    <Text style={styles.txidLabel}>WITHDRAWAL ID</Text>
                    <View style={styles.txidBox}>
                      <Text style={styles.txidText}>{withdrawSuccessTxid.slice(0, 20)}...{withdrawSuccessTxid.slice(-8)}</Text>
                      <TouchableOpacity onPress={() => copyTxid(withdrawSuccessTxid)} style={styles.copyTxidButton}>
                        <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                
                <View style={styles.challengeInfo}>
                  <Ionicons name="time-outline" size={18} color="#10b981" />
                  <Text style={styles.challengeInfoText}>
                    Your KRAY ▽ will be sent to your L1 address in ~1 minute!
                  </Text>
                </View>
              </View>
            ) : null}
            
            {/* Withdraw Button */}
            <TouchableOpacity
              style={[
                styles.sendButton, 
                styles.withdrawButton, 
                (isWithdrawing || (!selectedUtxo && !withdrawSuccessTxid)) && styles.sendButtonDisabled
              ]}
              onPress={withdrawSuccessTxid ? handleWithdrawDone : handleWithdraw}
              disabled={isWithdrawing || (!selectedUtxo && !withdrawSuccessTxid)}
            >
              {isWithdrawing ? (
                <ActivityIndicator color="#fff" />
              ) : withdrawSuccessTxid ? (
                <Text style={styles.sendButtonText}>✓ Done</Text>
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Sign & Request Withdrawal</Text>
                </>
              )}
            </TouchableOpacity>
            
            {!withdrawSuccessTxid && (
            <Text style={styles.withdrawNote}>
              ▽ After signing, your KRAY will be sent to L1 in ~1 minute
            </Text>
            )}
          </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>

      {/* Bottom Tab Bar - L2 Features (igual extension) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bottomBarItem}
          onPress={openDepositModal}
        >
          <Ionicons name="arrow-down-circle" size={22} color="#10b981" />
          <Text style={styles.bottomBarText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomBarItem}
          onPress={openWithdrawModal}
        >
          <Ionicons name="arrow-up-circle" size={22} color="#f59e0b" />
          <Text style={styles.bottomBarText}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomBarItem}
          onPress={() => setShowTransferModal(true)}
        >
          <Ionicons name="flash" size={22} color="#fff" />
          <Text style={styles.bottomBarText}>Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomBarItem}
          onPress={() => setShowSwapModal(true)}
        >
          <Ionicons name="swap-horizontal" size={22} color="#fff" />
          <Text style={styles.bottomBarText}>Swap</Text>
        </TouchableOpacity>
      </View>

      {/* QR Scanner */}
      <WebQRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        title="Scan Address"
        hint="Point your camera at a Bitcoin address QR code"
      />

      {/* Full Transaction History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalContainer}>
          {/* Header */}
          <View style={styles.historyModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowHistoryModal(false)}
              style={styles.historyModalClose}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.historyModalTitle}>Transaction History</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Transaction List */}
          <ScrollView 
            style={styles.historyModalList}
            showsVerticalScrollIndicator={false}
          >
            {(l2?.transactions ?? []).map((tx: any, index: number) => {
              const amount = parseInt(tx.amount) || 0;
              const isSent = tx.type === 'transfer' && tx.from === wallet?.address;
              const isDeposit = tx.type === 'deposit';
              const isWithdrawal = tx.type === 'withdrawal';
              const txHash = tx.tx_hash || tx.id || '';
              
              return (
                <TouchableOpacity 
                  key={tx.id || index} 
                  style={styles.historyModalItem}
                  onPress={() => {
                    if (txHash) {
                      Linking.openURL(`https://kray.space/krayscan.html?l2tx=${txHash}`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyLeft}>
                    <View style={[
                      styles.historyIcon,
                      isDeposit ? styles.historyIconDeposit :
                      isWithdrawal ? styles.historyIconWithdraw :
                      isSent ? styles.historyIconSent : styles.historyIconReceived
                    ]}>
                      <Ionicons 
                        name={
                          isDeposit ? "arrow-down" :
                          isWithdrawal ? "arrow-up" :
                          isSent ? "arrow-up" : "arrow-down"
                        } 
                        size={16} 
                        color="#fff" 
                      />
                    </View>
                    <View>
                      <Text style={styles.historyType}>
                        {isDeposit ? 'Deposit' :
                         isWithdrawal ? 'Withdrawal' :
                         isSent ? 'Sent' : 'Received'}
                      </Text>
                      <Text style={styles.historyTime}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[
                      styles.historyAmount,
                      isSent || isWithdrawal ? styles.historyAmountSent : styles.historyAmountReceived
                    ]}>
                      {isSent || isWithdrawal ? '-' : '+'}{amount.toLocaleString()} ▽
                    </Text>
                    <View style={styles.historyStatusRow}>
                      <Text style={styles.historyStatus}>{tx.status || 'confirmed'}</Text>
                      <Ionicons name="open-outline" size={12} color="#666" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {(l2?.transactions?.length ?? 0) === 0 && (
              <View style={styles.historyEmpty}>
                <Ionicons name="flash-outline" size={48} color="#444" />
                <Text style={styles.historyEmptyText}>No transactions yet</Text>
              </View>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  statusDotConnected: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  statusTextConnected: {
    color: '#10b981',
  },
  bridgeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  bridgeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  bridgeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bridgeDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  balances: {
    marginTop: 8,
  },
  balancesTitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 12,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tokenLogoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tokenLogo: {
    width: 36,
    height: 36,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tokenSubname: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  kraySymbol: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  tokenLabel: {
    fontSize: 10,
    color: '#666',
  },
  membershipCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  membershipIcon: {
    fontSize: 12,
  },
  membershipName: {
    fontSize: 11,
    fontWeight: '600',
  },
  freeTxCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  freeTxLabel: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 2,
  },
  freeTxSubtext: {
    fontSize: 10,
    color: '#666',
  },
  freeTxRight: {
    alignItems: 'flex-end',
  },
  freeTxCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#888',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  pendingLeft: {},
  pendingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pendingStatus: {
    fontSize: 11,
    color: '#f59e0b',
  },
  pendingTime: {
    fontSize: 12,
    color: '#888',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
  },
  tokenSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tokenOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tokenOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  tokenOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  tokenOptionTextActive: {
    color: '#fff',
  },
  // Token Scroll Selector (with thumbnails)
  tokenScrollContainer: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  tokenScrollContent: {
    paddingHorizontal: 4,
    gap: 10,
  },
  tokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
    minWidth: 120,
  },
  tokenCardActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tokenCardImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tokenCardInfo: {
    flex: 1,
  },
  tokenCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
  },
  tokenCardNameActive: {
    color: '#fff',
  },
  tokenCardBalance: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  tokenCardCheck: {
    marginLeft: 4,
  },
  noTokensMessage: {
    padding: 20,
    alignItems: 'center',
  },
  noTokensText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  noTokensSubtext: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
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
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountToken: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 12,
  },
  balanceHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
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
  successIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  successIconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(247,147,26,0.2)',
    top: -15,
    left: -15,
  },
  successTitle: {
    color: '#f7931a',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  successSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  transferSummary: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryValueSmall: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  summaryValueGreen: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  explorerLinks: {
    width: '100%',
    gap: 8,
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
  pendingNote: {
    color: '#f59e0b',
    fontSize: 13,
    marginTop: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  feeNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  // Swap specific
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swapTokenSelect: {
    flexDirection: 'row',
    gap: 4,
  },
  swapTokenBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  swapTokenBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  swapTokenText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  swapArrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  swapEstimate: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    padding: 14,
  },
  // Deposit specific
  depositInfo: {
    marginBottom: 20,
  },
  depositLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  depositAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  depositAddress: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 8,
  },
  depositNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(247,147,26,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247,147,26,0.2)',
  },
  depositNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#f7931a',
    lineHeight: 18,
  },
  rateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  rateLabel: {
    fontSize: 13,
    color: '#888',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f7931a',
  },
  // Withdraw specific
  withdrawButton: {
    backgroundColor: '#f59e0b',
  },
  withdrawEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginBottom: 20,
  },
  withdrawEstLabel: {
    fontSize: 13,
    color: '#888',
  },
  withdrawEstValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  withdrawNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomBarText: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  // Password input styles
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 10,
    marginLeft: -44,
  },
  // QR Code styles
  qrContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  qrLabel: {
    fontSize: 13,
    color: '#000',
    marginBottom: 12,
    fontWeight: '600',
  },
  qrPlaceholder: {
    padding: 10,
  },
  // History styles (igual extension)
  historySection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  historyEmpty: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
  },
  historyEmptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
  },
  historyEmptySubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconDeposit: {
    backgroundColor: '#10b981',
  },
  historyIconWithdraw: {
    backgroundColor: '#f59e0b',
  },
  historyIconSent: {
    backgroundColor: '#ef4444',
  },
  historyIconReceived: {
    backgroundColor: '#10b981',
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  historyTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyAmountSent: {
    color: '#ef4444',
  },
  historyAmountReceived: {
    color: '#10b981',
  },
  historyStatus: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
  },
  historyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  // History Modal styles
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  historyModalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  historyModalList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  historyModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  // Security styles (igual extension)
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  securityNoteText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  fixedAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  fixedAddressText: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  // Modal scroll content
  modalScrollContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // Progress Box (during withdrawal)
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  progressText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },
  // Fee Rate Selector (igual extension)
  feeRateSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  feeRateOption: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  feeRateOptionSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  feeRateName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  feeRateNameSelected: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  feeRateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  feeRateSats: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  // UTXO Selector
  utxoLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  utxoLoadingText: {
    fontSize: 13,
    color: '#888',
  },
  utxoEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    gap: 10,
  },
  utxoEmptyText: {
    flex: 1,
    fontSize: 12,
    color: '#f59e0b',
    lineHeight: 18,
  },
  utxoList: {
    flexDirection: 'row',
    marginTop: 8,
  },
  utxoItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  utxoItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  utxoItemInsufficient: {
    opacity: 0.5,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  utxoTxid: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  utxoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  utxoValueSelected: {
    color: '#10b981',
  },
  utxoValueInsufficient: {
    color: '#ef4444',
  },
  utxoCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  utxoInsufficientLabel: {
    fontSize: 9,
    color: '#ef4444',
    marginTop: 2,
  },
  // Fee Summary
  feeSummary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  feeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeSummaryLabel: {
    fontSize: 12,
    color: '#888',
  },
  feeSummaryValue: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'monospace',
  },
  feeSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  feeSummaryLabelTotal: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  feeSummaryValueTotal: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Receive Modal Styles
  receiveQrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrCodeBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qrImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiveAddressSection: {
    marginBottom: 20,
  },
  receiveAddressLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
  },
  receiveAddressBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  receiveAddressText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  receiveCopyBtn: {
    alignItems: 'center',
  },
  copyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  copyBtnInnerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  copyBtnTextSuccess: {
    color: '#10b981',
  },
  receiveNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  receiveNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
  },
  receiveCloseBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  receiveCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Challenge Info
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    gap: 10,
    width: '100%',
  },
  challengeInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#f59e0b',
    lineHeight: 18,
  },
  // Address Input Row with Scan Button
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

