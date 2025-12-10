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

export function L2Tab() {
  const { l2, wallet, sendL2, withdrawL2, swapL2, refreshL2 } = useWallet();
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  
  // Transfer state
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferToken, setTransferToken] = useState('KRAY');
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
  const [depositAddress, setDepositAddress] = useState('');
  
  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccessTxid, setWithdrawSuccessTxid] = useState<string | null>(null);

  // Copy TXID helper
  const copyTxid = async (txid: string) => {
    await Clipboard.setStringAsync(txid);
    setCopiedTxid(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setCopiedTxid(false), 2000);
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

  // Handle Withdraw
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(withdrawAmount) > (l2?.balanceKray ?? 0)) {
      setWithdrawError('Insufficient L2 balance');
      return;
    }
    
    setIsWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccessTxid(null);
    
    try {
      const txHash = await withdrawL2(parseFloat(withdrawAmount));
      
      if (txHash) {
        setWithdrawSuccessTxid(typeof txHash === 'string' ? txHash : 'pending');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Refresh L2 data
        refreshL2();
        
        // DON'T auto-close - let user see success screen
      }
    } catch (error: any) {
      setWithdrawError(error.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleWithdrawDone = () => {
    setShowWithdrawModal(false);
    setWithdrawSuccessTxid(null);
    setWithdrawAmount('');
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter a valid address and amount');
      return;
    }
    
    setIsTransferring(true);
    setTransferError('');
    setTransferSuccessTxid(null);
    
    try {
      // Call real L2 transfer API
      const txHash = await sendL2(transferTo, parseFloat(transferAmount), transferToken);
      
      setTransferSuccessTxid(txHash);
      console.log('✅ L2 Transfer TX:', txHash);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Refresh L2 data
      refreshL2();
      
      // DON'T auto-close - let user see success screen
    } catch (error: any) {
      setTransferError(error.message || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleTransferDone = () => {
    setShowTransferModal(false);
    setTransferSuccessTxid(null);
    setTransferTo('');
    setTransferAmount('');
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
            <Ionicons name="flash" size={18} color="#8b5cf6" />
            <Text style={styles.bridgeButtonText}>Send ⚡</Text>
          </TouchableOpacity>
          
          <View style={styles.bridgeDivider} />
          
          <TouchableOpacity 
            style={styles.bridgeButton}
            onPress={() => {/* Show receive address */}}
          >
            <Ionicons name="qr-code" size={18} color="#8b5cf6" />
            <Text style={styles.bridgeButtonText}>Receive ⚡</Text>
          </TouchableOpacity>
        </View>

        {/* Token Balances */}
        <View style={styles.balances}>
          <Text style={styles.balancesTitle}>Your Tokens</Text>
          
          <View style={styles.tokenRow}>
            <View style={styles.tokenLeft}>
              <Text style={styles.tokenIcon}>⚡</Text>
              <Text style={styles.tokenName}>KRAY</Text>
            </View>
            <View style={styles.tokenRight}>
              <Text style={styles.tokenBalance}>{(l2?.balanceKray ?? 0).toLocaleString()}</Text>
              <Text style={styles.tokenLabel}>Gas Token</Text>
            </View>
          </View>

          {(l2?.balanceDog ?? 0) > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <Text style={styles.tokenIcon}>🐕</Text>
                <Text style={styles.tokenName}>DOG</Text>
              </View>
              <Text style={styles.tokenBalance}>{(l2?.balanceDog ?? 0).toFixed(5)}</Text>
            </View>
          )}

          {(l2?.balanceDogsocial ?? 0) > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <Text style={styles.tokenIcon}>🎭</Text>
                <Text style={styles.tokenName}>DOGSOCIAL</Text>
              </View>
              <Text style={styles.tokenBalance}>{(l2?.balanceDogsocial ?? 0).toFixed(5)}</Text>
            </View>
          )}

          {(l2?.balanceRadiola ?? 0) > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <Text style={styles.tokenIcon}>🎵</Text>
                <Text style={styles.tokenName}>RADIOLA</Text>
              </View>
              <Text style={styles.tokenBalance}>{(l2?.balanceRadiola ?? 0).toFixed(5)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Membership Card */}
      <View style={styles.membershipCard}>
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipTitle}>🎴 Membership</Text>
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

      {/* Bottom padding for the fixed bar */}
      <View style={{ height: 100 }} />

      {/* Pending Withdrawals */}
      {(l2?.pendingWithdrawals?.length ?? 0) > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>⏳ Pending Withdrawals</Text>
          {(l2?.pendingWithdrawals ?? []).map((withdrawal, index) => (
            <View key={index} style={styles.pendingItem}>
              <View style={styles.pendingLeft}>
                <Text style={styles.pendingAmount}>{withdrawal.amount} KRAY</Text>
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
              <Text style={styles.modalTitle}>💸 L2 Transfer</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Send tokens instantly on KRAY L2</Text>
            
            {/* Token Selector */}
            <View style={styles.tokenSelector}>
              {['KRAY', 'DOG', 'DOGSOCIAL'].map(token => (
                <TouchableOpacity
                  key={token}
                  style={[styles.tokenOption, transferToken === token && styles.tokenOptionActive]}
                  onPress={() => setTransferToken(token)}
                >
                  <Text style={[styles.tokenOptionText, transferToken === token && styles.tokenOptionTextActive]}>
                    {token}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* To Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>To Address</Text>
              <TextInput
                style={styles.input}
                placeholder="bc1p... or KRAY address"
                placeholderTextColor="#666"
                value={transferTo}
                onChangeText={setTransferTo}
                autoCapitalize="none"
              />
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
                Balance: {transferToken === 'KRAY' ? (l2?.balanceKray ?? 0).toLocaleString() : 
                         transferToken === 'DOG' ? (l2?.balanceDog ?? 0).toFixed(5) :
                         (l2?.balanceDogsocial ?? 0).toFixed(5)} {transferToken}
              </Text>
            </View>
            
            {/* Error/Success Messages */}
            {transferError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{transferError}</Text>
              </View>
            ) : null}
            
            {/* SUCCESS SCREEN */}
            {transferSuccessTxid ? (
              <View style={styles.successScreen}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                <Text style={styles.successTitle}>⚡ Transfer Complete!</Text>
                <Text style={styles.successSubtitle}>L2 transfer confirmed instantly</Text>
                
                <Text style={styles.txidLabel}>TRANSACTION HASH</Text>
                <View style={styles.txidBox}>
                  <Text style={styles.txidText}>{transferSuccessTxid.slice(0, 20)}...{transferSuccessTxid.slice(-8)}</Text>
                  <TouchableOpacity onPress={() => copyTxid(transferSuccessTxid)} style={styles.copyTxidButton}>
                    <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.explorerButton}
                  onPress={() => Linking.openURL(`https://krayscan.com/l2/tx/${transferSuccessTxid}`)}
                >
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <Text style={styles.explorerText}>View on KrayScan L2</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
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
              <Text style={styles.modalTitle}>🔄 L2 Swap</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
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
              <Ionicons name="swap-vertical" size={24} color="#8b5cf6" />
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
                <Text style={styles.successTitle}>🔄 Swap Complete!</Text>
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
                  onPress={() => Linking.openURL(`https://krayscan.com/l2/tx/${swapSuccessTxid}`)}
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

      {/* Deposit Modal */}
      <Modal
        visible={showDepositModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDepositModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📥 Deposit to L2</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Send BTC to receive KRAY on L2</Text>
            
            <View style={styles.depositInfo}>
              <Text style={styles.depositLabel}>Deposit Address</Text>
              <View style={styles.depositAddressBox}>
                <Text style={styles.depositAddress} selectable>
                  {wallet?.address || 'Loading...'}
                </Text>
                <TouchableOpacity style={styles.copyBtn}>
                  <Ionicons name="copy" size={18} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.depositNote}>
                <Ionicons name="information-circle" size={16} color="#f59e0b" />
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

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📤 Withdraw from L2</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Convert KRAY back to BTC</Text>
            
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
              />
              <Text style={styles.balanceHint}>
                Balance: {(l2?.balanceKray ?? 0).toLocaleString()} KRAY
              </Text>
            </View>
            
            {/* To Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bitcoin Address</Text>
              <TextInput
                style={styles.input}
                placeholder="bc1q... (Mainnet)"
                placeholderTextColor="#666"
                value={withdrawTo}
                onChangeText={setWithdrawTo}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.withdrawEstimate}>
              <Text style={styles.withdrawEstLabel}>You will receive</Text>
              <Text style={styles.withdrawEstValue}>
                ~{withdrawAmount ? (parseFloat(withdrawAmount) / 100000).toFixed(8) : '0.00000000'} BTC
              </Text>
            </View>
            
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
                <Text style={styles.successTitle}>📤 Withdrawal Initiated!</Text>
                <Text style={styles.successSubtitle}>Your BTC is on the way to mainnet</Text>
                
                {withdrawSuccessTxid !== 'pending' && (
                  <>
                    <Text style={styles.txidLabel}>TRANSACTION HASH</Text>
                    <View style={styles.txidBox}>
                      <Text style={styles.txidText}>{withdrawSuccessTxid.slice(0, 20)}...{withdrawSuccessTxid.slice(-8)}</Text>
                      <TouchableOpacity onPress={() => copyTxid(withdrawSuccessTxid)} style={styles.copyTxidButton}>
                        <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.explorerButton}
                      onPress={() => Linking.openURL(`https://mempool.space/tx/${withdrawSuccessTxid}`)}
                    >
                      <Ionicons name="globe-outline" size={18} color="#fff" />
                      <Text style={styles.explorerText}>View on mempool.space</Text>
                      <Ionicons name="open-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
                
                <Text style={styles.pendingNote}>⏱️ Withdrawal takes 10-30 minutes</Text>
              </View>
            ) : null}
            
            {/* Withdraw Button */}
            <TouchableOpacity
              style={[styles.sendButton, styles.withdrawButton, isWithdrawing && styles.sendButtonDisabled]}
              onPress={withdrawSuccessTxid ? handleWithdrawDone : handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <ActivityIndicator color="#fff" />
              ) : withdrawSuccessTxid ? (
                <Text style={styles.sendButtonText}>✓ Done</Text>
              ) : (
                <>
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Withdraw to Mainnet</Text>
                </>
              )}
            </TouchableOpacity>
            
            {!withdrawSuccessTxid && (
            <Text style={styles.withdrawNote}>
              ⏱️ Withdrawals typically take 10-30 minutes
            </Text>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>

      {/* Bottom Tab Bar - L2 Features */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bottomBarItem}
          onPress={() => setShowTransferModal(true)}
        >
          <Ionicons name="flash" size={22} color="#8b5cf6" />
          <Text style={styles.bottomBarText}>Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomBarItem}
          onPress={() => setShowSwapModal(true)}
        >
          <Ionicons name="swap-horizontal" size={22} color="#8b5cf6" />
          <Text style={styles.bottomBarText}>Swap</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomBarItem}>
          <Ionicons name="water" size={22} color="#8b5cf6" />
          <Text style={styles.bottomBarText}>Pool</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomBarItem}>
          <Ionicons name="receipt" size={22} color="#8b5cf6" />
          <Text style={styles.bottomBarText}>History</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
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
    gap: 8,
  },
  tokenIcon: {
    fontSize: 16,
  },
  tokenName: {
    fontSize: 13,
    color: '#888',
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  tokenLabel: {
    fontSize: 10,
    color: '#666',
  },
  membershipCard: {
    marginBottom: 16,
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: '#8b5cf6',
  },
  tokenOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  tokenOptionTextActive: {
    color: '#8b5cf6',
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
    color: '#8b5cf6',
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
    backgroundColor: '#8b5cf6',
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
    color: '#fff',
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
    backgroundColor: 'rgba(139,92,246,0.2)',
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
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
  },
  depositNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#f59e0b',
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
    color: '#10b981',
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
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomBarText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },
});

