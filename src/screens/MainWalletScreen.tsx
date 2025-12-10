/**
 * Main Wallet Screen
 * KRAY OS Style - Black & White
 * With QR Scanner and QR Code generation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../context/WalletContext';
import { getBridgeDepositAddress } from '../services/api';
import colors from '../theme/colors';

import { OrdinalsTab } from '../components/tabs/OrdinalsTab';
import { RunesTab } from '../components/tabs/RunesTab';
import { ActivityTab } from '../components/tabs/ActivityTab';
import { L2Tab } from '../components/tabs/L2Tab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MainWalletScreenProps {
  onSettings: () => void;
  onSend: () => void;
  onReceive: () => void;
  onAtomicSwap?: () => void;
  onMarket?: () => void;
}

type TabType = 'ordinals' | 'runes' | 'activity' | 'l2';
type NetworkType = 'mainnet' | 'kray-l2' | 'testnet';

export function MainWalletScreen({ onSettings, onSend, onReceive, onAtomicSwap, onMarket }: MainWalletScreenProps) {
  const { wallet, network, l2, refreshAll, switchNetwork, sendL2, withdrawL2, sendOrdinal, sendRune } = useWallet();
  
  const [activeTab, setActiveTab] = useState<TabType>('ordinals');
  const [refreshing, setRefreshing] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // L2 Send Modal State
  const [showL2SendModal, setShowL2SendModal] = useState(false);
  const [l2SendTo, setL2SendTo] = useState('');
  const [l2SendAmount, setL2SendAmount] = useState('');
  const [l2SendToken, setL2SendToken] = useState('KRAY');
  const [isL2Sending, setIsL2Sending] = useState(false);
  const [l2SendError, setL2SendError] = useState('');
  const [l2SendSuccess, setL2SendSuccess] = useState('');
  
  // L2 Receive Modal State  
  const [showL2ReceiveModal, setShowL2ReceiveModal] = useState(false);
  const [l2AddressCopied, setL2AddressCopied] = useState(false);
  
  // L2 Deposit/Withdraw Modal State
  const [showL2DepositModal, setShowL2DepositModal] = useState(false);
  const [showL2WithdrawModal, setShowL2WithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  
  // Bridge address for deposits (from backend)
  const [bridgeAddress, setBridgeAddress] = useState('bc1pxtt3tzrcp4zxy5z43vzhwac47dc6tl4s6l0gfdyuzvx66ljr3x7srwetnd');
  const [bridgeAddressCopied, setBridgeAddressCopied] = useState(false);
  
  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'l2send' | 'send'>('l2send');
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    refreshAll();
    // Get bridge address from backend
    getBridgeDepositAddress().then(addr => {
      if (addr) setBridgeAddress(addr);
    });
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return; // Prevent double refresh
    
    console.log('🔄 Refreshing wallet data...');
    setRefreshing(true);
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await refreshAll();
      console.log('✅ Wallet data refreshed!');
      console.log('📊 Transactions:', wallet?.transactions?.length || 0);
      console.log('💰 Balance:', wallet?.balanceSats || 0, 'sats');
    } catch (error) {
      console.error('❌ Refresh error:', error);
    }
    setRefreshing(false);
  };

  const handleCopyAddress = async () => {
    if (wallet?.address) {
      await Clipboard.setStringAsync(wallet.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNetworkChange = async (newNetwork: NetworkType) => {
    await switchNetwork(newNetwork);
    setShowNetworkDropdown(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // L2 Instant Send
  const handleL2Send = async () => {
    if (!l2SendTo || !l2SendAmount || parseFloat(l2SendAmount) <= 0) {
      setL2SendError('Enter a valid address and amount');
      return;
    }
    
    setIsL2Sending(true);
    setL2SendError('');
    setL2SendSuccess('');
    
    try {
      // Call real L2 transfer API
      const txHash = await sendL2(l2SendTo, parseFloat(l2SendAmount), l2SendToken);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      console.log('✅ L2 Transfer TX:', txHash);
      setL2SendSuccess(`⚡ Sent ${l2SendAmount} ${l2SendToken} instantly!`);
      setL2SendTo('');
      setL2SendAmount('');
      
      // Auto close
      setTimeout(() => {
        setShowL2SendModal(false);
        setL2SendSuccess('');
      }, 2000);
    } catch (error: any) {
      setL2SendError(error.message || 'Transfer failed');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsL2Sending(false);
    }
  };

  // L2 Copy Address
  const handleL2CopyAddress = async () => {
    if (wallet?.address) {
      await Clipboard.setStringAsync(wallet.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setL2AddressCopied(true);
      setTimeout(() => setL2AddressCopied(false), 2000);
    }
  };

  // Parse Bitcoin/L2 address from QR code
  const parseAddressFromQR = (data: string): string => {
    // Handle bitcoin: URIs
    if (data.toLowerCase().startsWith('bitcoin:')) {
      const withoutScheme = data.slice(8);
      const [addr] = withoutScheme.split('?');
      return addr;
    }
    // Plain address
    return data;
  };

  // Handle QR code scan
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const address = parseAddressFromQR(data);
    
    if (scannerTarget === 'l2send') {
      setL2SendTo(address);
    }
    
    setShowScanner(false);
    setScanned(false);
  };

  // L2 Withdraw
  const handleL2Withdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Enter a valid amount');
      return;
    }
    
    if (parseFloat(withdrawAmount) > (l2?.balanceKray ?? 0)) {
      setWithdrawError('Insufficient L2 balance');
      return;
    }
    
    setIsWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccess('');
    
    try {
      const success = await withdrawL2(parseFloat(withdrawAmount));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (success) {
        const btcAmount = (parseFloat(withdrawAmount) / 100000).toFixed(8);
        setWithdrawSuccess(`📤 Withdrawal of ${withdrawAmount} KRAY (~${btcAmount} BTC) initiated!`);
        setWithdrawAmount('');
        
        // Auto close
        setTimeout(() => {
          setShowL2WithdrawModal(false);
          setWithdrawSuccess('');
        }, 3000);
      }
    } catch (error: any) {
      setWithdrawError(error.message || 'Withdrawal failed');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Open QR scanner
  const openScanner = async (target: 'l2send' | 'send') => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }
    setScannerTarget(target);
    setShowScanner(true);
  };

  // Handle Send button - L2 or Mainnet
  const handleSendPress = () => {
    if (isL2) {
      setShowL2SendModal(true);
    } else {
      onSend();
    }
  };

  // Handle Receive button - L2 or Mainnet
  const handleReceivePress = () => {
    if (isL2) {
      setShowL2ReceiveModal(true);
    } else {
      onReceive();
    }
  };

  const formatBalance = (sats: number) => sats.toLocaleString();
  const formatBTC = (sats: number) => (sats / 100000000).toFixed(8);

  // Format address to show truncated version
  const formatAddress = (addr: string, chars: number = 8) => {
    if (!addr) return '';
    if (addr.length <= chars * 2) return addr;
    return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
  };

  const getNetworkIcon = (net: NetworkType) => {
    switch (net) {
      case 'mainnet': return '₿';
      case 'kray-l2': return '⚡';
      case 'testnet': return '🧪';
    }
  };

  const getNetworkName = (net: NetworkType) => {
    switch (net) {
      case 'mainnet': return 'Mainnet';
      case 'kray-l2': return 'KRAY L2';
      case 'testnet': return 'Testnet';
    }
  };

  const isL2 = network === 'kray-l2';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.networkSelector}
            onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
          >
            <Text style={styles.networkIcon}>{getNetworkIcon(network as NetworkType)}</Text>
            <Text style={styles.networkName}>{getNetworkName(network as NetworkType)}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.refreshButton}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="refresh" size={22} color={colors.textPrimary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Network Dropdown */}
        {showNetworkDropdown && (
          <View style={styles.networkDropdown}>
            {(['mainnet', 'kray-l2', 'testnet'] as NetworkType[]).map((net) => (
              <TouchableOpacity
                key={net}
                style={[styles.networkOption, network === net && styles.networkOptionActive]}
                onPress={() => handleNetworkChange(net)}
              >
                <Text style={styles.networkOptionIcon}>{getNetworkIcon(net)}</Text>
                <Text style={styles.networkOptionText}>{getNetworkName(net)}</Text>
                {network === net && <Ionicons name="checkmark" size={18} color={colors.textPrimary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            Platform.OS !== 'web' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textPrimary}
                colors={[colors.textPrimary]}
              />
            ) : undefined
          }
        >
          {/* Address Card */}
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>MY WALLET</Text>
            <TouchableOpacity onPress={handleCopyAddress} style={styles.addressRow}>
              <Text style={styles.addressText}>
                {wallet?.address ? `${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}` : '...'}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copied ? colors.success : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Balance Section */}
          <View style={styles.balanceSection}>
            {isL2 ? (
              <>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, l2.isConnected && styles.statusDotActive]} />
                  <Text style={styles.statusText}>
                    {l2.isConnected ? 'Connected' : 'Offline'}
                  </Text>
                </View>
                <Text style={styles.balanceLabel}>KRAY BALANCE</Text>
                <Text style={styles.balanceAmount}>
                  {l2.balanceKray.toLocaleString()} <Text style={styles.balanceUnit}>KRAY</Text>
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
                <Text style={styles.balanceAmount}>
                  {formatBalance(wallet?.balanceSats || 0)} <Text style={styles.balanceUnit}>sats</Text>
                </Text>
                <Text style={styles.balanceBTC}>
                  {formatBTC(wallet?.balanceSats || 0)} BTC
                </Text>
                {/* Show pending balance if any */}
                {(wallet?.unconfirmedBalance ?? 0) !== 0 && (
                  <View style={styles.pendingBalance}>
                    <Ionicons name="time-outline" size={14} color="#f59e0b" />
                    <Text style={styles.pendingBalanceText}>
                      {(wallet?.unconfirmedBalance ?? 0) > 0 ? '+' : ''}{formatBalance(wallet?.unconfirmedBalance ?? 0)} sats pending
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Action Buttons - Different for L2 vs Mainnet */}
          {isL2 ? (
            // L2: Deposit/Withdraw are main actions
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setShowL2DepositModal(true)} activeOpacity={0.8}>
                <Ionicons name="arrow-down-circle" size={24} color={colors.buttonPrimaryText} />
                <Text style={styles.actionButtonText}>Deposit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButtonAlt} onPress={() => setShowL2WithdrawModal(true)} activeOpacity={0.8}>
                <Ionicons name="arrow-up-circle" size={24} color={colors.textPrimary} />
                <Text style={styles.actionButtonTextAlt}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Mainnet: Send/Receive are main actions
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={onSend} activeOpacity={0.8}>
                <Ionicons name="arrow-up" size={24} color={colors.buttonPrimaryText} />
                <Text style={styles.actionButtonText}>Send</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButtonAlt} onPress={onReceive} activeOpacity={0.8}>
                <Ionicons name="arrow-down" size={24} color={colors.textPrimary} />
                <Text style={styles.actionButtonTextAlt}>Receive</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DeFi Features - Atomic Swap & Market */}
          <View style={styles.defiButtons}>
            <TouchableOpacity 
              style={styles.defiButton} 
              onPress={onAtomicSwap}
              activeOpacity={0.8}
            >
              <Text style={styles.defiIcon}>⚛️</Text>
              <Text style={styles.defiButtonText}>Swap</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.defiButton} 
              onPress={onMarket}
              activeOpacity={0.8}
            >
              <Text style={styles.defiIcon}>🏪</Text>
              <Text style={styles.defiButtonText}>Market</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          {isL2 ? (
            <L2Tab />
          ) : (
            <>
              <View style={styles.tabsContainer}>
                {(['ordinals', 'runes', 'activity'] as TabType[]).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tabContent}>
                {activeTab === 'ordinals' && (
                  <OrdinalsTab 
                    ordinals={wallet?.ordinals || []} 
                    walletAddress={wallet?.address}
                    onTransfer={async (ordinal, toAddress, password) => {
                      return await sendOrdinal(ordinal.id, toAddress, password);
                    }}
                  />
                )}
                {activeTab === 'runes' && (
                  <RunesTab 
                    runes={wallet?.runes || []} 
                    walletAddress={wallet?.address}
                    onTransfer={async (rune, toAddress, amount, password) => {
                      return await sendRune(rune.id, toAddress, amount, password);
                    }}
                  />
                )}
                {activeTab === 'activity' && <ActivityTab transactions={wallet?.transactions || []} address={wallet?.address} />}
              </View>
            </>
          )}
        </ScrollView>

        {/* L2 Send Modal - Instant Transfer */}
        <Modal
          visible={showL2SendModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowL2SendModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⚡ L2 Send Instantly</Text>
                <TouchableOpacity onPress={() => setShowL2SendModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>Send KRAY tokens instantly on L2</Text>
              
              {/* Token Selector */}
              <View style={styles.tokenSelector}>
                {['KRAY', 'DOG', 'DOGSOCIAL'].map(token => (
                  <TouchableOpacity
                    key={token}
                    style={[styles.tokenOption, l2SendToken === token && styles.tokenOptionActive]}
                    onPress={() => setL2SendToken(token)}
                  >
                    <Text style={[styles.tokenOptionText, l2SendToken === token && styles.tokenOptionTextActive]}>
                      {token}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* To Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>To Address</Text>
                <View style={styles.addressInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter KRAY L2 address"
                    placeholderTextColor={colors.textMuted}
                    value={l2SendTo}
                    onChangeText={setL2SendTo}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.scanButton}
                    onPress={() => openScanner('l2send')}
                  >
                    <Ionicons name="scan" size={22} color={colors.textPrimary} />
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
                    placeholderTextColor={colors.textMuted}
                    value={l2SendAmount}
                    onChangeText={setL2SendAmount}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.amountToken}>{l2SendToken}</Text>
                </View>
                <Text style={styles.balanceHint}>
                  Balance: {l2SendToken === 'KRAY' ? (l2?.balanceKray ?? 0).toLocaleString() : 
                           l2SendToken === 'DOG' ? (l2?.balanceDog ?? 0).toFixed(5) :
                           (l2?.balanceDogsocial ?? 0).toFixed(5)} {l2SendToken}
                </Text>
              </View>
              
              {/* Error/Success */}
              {l2SendError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{l2SendError}</Text>
                </View>
              ) : null}
              
              {l2SendSuccess ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.successText}>{l2SendSuccess}</Text>
                </View>
              ) : null}
              
              {/* Send Button */}
              <TouchableOpacity
                style={[styles.l2SendButton, isL2Sending && styles.l2SendButtonDisabled]}
                onPress={handleL2Send}
                disabled={isL2Sending}
              >
                {isL2Sending ? (
                  <ActivityIndicator color={colors.buttonPrimaryText} />
                ) : (
                  <>
                    <Ionicons name="flash" size={20} color={colors.buttonPrimaryText} />
                    <Text style={styles.l2SendButtonText}>Send Instantly</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.feeNote}>
                ⚡ Free TX: {l2?.membership?.usedToday ?? 0}/{l2?.membership?.freePerDay ?? 0} used today
              </Text>
            </View>
          </View>
        </Modal>

        {/* L2 Receive Modal */}
        <Modal
          visible={showL2ReceiveModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowL2ReceiveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⚡ Receive on L2</Text>
                <TouchableOpacity onPress={() => setShowL2ReceiveModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>Share your address to receive KRAY, Runes, and tokens instantly</Text>
              
              {/* QR Code */}
              <View style={styles.qrCodeContainer}>
                {wallet?.address && (
                  <QRCode
                    value={wallet.address}
                    size={SCREEN_WIDTH * 0.55}
                    color="#fff"
                    backgroundColor="#000"
                  />
                )}
              </View>
              
              <View style={styles.receiveAddressBox}>
                <Text style={styles.receiveAddressLabel}>Your L2 Address</Text>
                <TouchableOpacity onPress={handleL2CopyAddress} style={styles.receiveAddressRow}>
                  <Text style={styles.receiveAddress} numberOfLines={1}>
                    {wallet?.address ? `${wallet.address.slice(0, 18)}...${wallet.address.slice(-18)}` : 'Loading...'}
                  </Text>
                  <View style={styles.copyButton}>
                    <Ionicons
                      name={l2AddressCopied ? 'checkmark-circle' : 'copy'}
                      size={20}
                      color={l2AddressCopied ? colors.success : colors.textPrimary}
                    />
                  </View>
                </TouchableOpacity>
                {l2AddressCopied && (
                  <Text style={styles.copiedText}>✓ Address copied!</Text>
                )}
              </View>
              
              <View style={styles.receiveInfo}>
                <Ionicons name="flash" size={18} color={colors.warning} />
                <Text style={styles.receiveInfoText}>
                  Transfers arrive instantly on KRAY L2. No confirmations needed.
                </Text>
              </View>
              
              <View style={styles.acceptedTokens}>
                <Text style={styles.acceptedTokensLabel}>Accepted Tokens</Text>
                <View style={styles.tokenList}>
                  <View style={styles.tokenBadge}>
                    <Text style={styles.tokenBadgeIcon}>⚡</Text>
                    <Text style={styles.tokenBadgeText}>KRAY</Text>
                  </View>
                  <View style={styles.tokenBadge}>
                    <Text style={styles.tokenBadgeIcon}>🐕</Text>
                    <Text style={styles.tokenBadgeText}>DOG</Text>
                  </View>
                  <View style={styles.tokenBadge}>
                    <Text style={styles.tokenBadgeIcon}>🎭</Text>
                    <Text style={styles.tokenBadgeText}>DOGSOCIAL</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* L2 Deposit Modal */}
        <Modal
          visible={showL2DepositModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowL2DepositModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📥 Deposit to L2</Text>
                <TouchableOpacity onPress={() => setShowL2DepositModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>Send BTC to the Bridge address to receive KRAY</Text>
              
              <View style={styles.depositBox}>
                <Text style={styles.depositLabel}>🌉 BRIDGE DEPOSIT ADDRESS</Text>
                <TouchableOpacity 
                  onPress={async () => {
                    await Clipboard.setStringAsync(bridgeAddress);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setBridgeAddressCopied(true);
                    setTimeout(() => setBridgeAddressCopied(false), 2000);
                  }} 
                  style={styles.depositAddressRow}
                >
                  <Text style={styles.depositAddressShort} numberOfLines={1}>
                    {formatAddress(bridgeAddress, 10)}
                  </Text>
                  <Ionicons 
                    name={bridgeAddressCopied ? "checkmark-circle" : "copy"} 
                    size={20} 
                    color={bridgeAddressCopied ? colors.success : colors.textPrimary} 
                  />
                </TouchableOpacity>
                <Text style={styles.depositAddressFull} selectable numberOfLines={2}>
                  {bridgeAddress}
                </Text>
              </View>
              
              <View style={styles.depositInfoBox}>
                <Text style={styles.depositInfoLabel}>Your L2 Address</Text>
                <Text style={styles.depositInfoValue} numberOfLines={1}>
                  {formatAddress(wallet?.address || '', 14)}
                </Text>
                <Text style={styles.depositInfoNote}>
                  KRAY will be credited to this address
                </Text>
              </View>
              
              <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>Exchange Rate</Text>
                <Text style={styles.rateValue}>1 BTC = 100,000 KRAY</Text>
              </View>
              
              <View style={styles.depositNote}>
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text style={styles.depositNoteText}>
                  Send any amount of BTC to the bridge. KRAY will arrive after 1 confirmation (~10-30 min)
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* L2 Withdraw Modal */}
        <Modal
          visible={showL2WithdrawModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowL2WithdrawModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📤 Withdraw from L2</Text>
                <TouchableOpacity onPress={() => setShowL2WithdrawModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>Convert KRAY back to BTC on mainnet</Text>
              
              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (KRAY)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.balanceHint}>
                  Balance: {(l2?.balanceKray ?? 0).toLocaleString()} KRAY
                </Text>
              </View>
              
              {/* Destination - Same address (bridge requirement) */}
              <View style={styles.withdrawDestination}>
                <Text style={styles.inputLabel}>Destination</Text>
                <View style={styles.withdrawAddressBox}>
                  <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                  <Text style={styles.withdrawAddressText}>
                    {formatAddress(wallet?.address || '', 10)}
                  </Text>
                </View>
                <Text style={styles.withdrawAddressNote}>
                  Bridge withdrawals go to your connected wallet address
                </Text>
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
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{withdrawError}</Text>
                </View>
              ) : null}
              
              {withdrawSuccess ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.successText}>{withdrawSuccess}</Text>
                </View>
              ) : null}
              
              {/* Withdraw Button */}
              <TouchableOpacity
                style={[styles.withdrawButton, isWithdrawing && styles.l2SendButtonDisabled]}
                onPress={handleL2Withdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color={colors.buttonPrimaryText} />
                ) : (
                  <>
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                    <Text style={styles.withdrawButtonText}>Withdraw to Mainnet</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.withdrawNote}>⏱️ Withdrawals take ~10-30 minutes</Text>
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
              {/* Top Bar */}
              <SafeAreaView style={styles.scannerHeader}>
                <TouchableOpacity 
                  style={styles.scannerCloseButton}
                  onPress={() => setShowScanner(false)}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.scannerTitle}>Scan QR Code</Text>
                <View style={styles.scannerPlaceholder} />
              </SafeAreaView>
              
              {/* Scan Frame */}
              <View style={styles.scannerFrameContainer}>
                <View style={styles.scannerFrame}>
                  {/* Corner decorations */}
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
              </View>
              
              {/* Bottom Info */}
              <View style={styles.scannerInfo}>
                <Text style={styles.scannerInfoText}>
                  Point your camera at an address QR code
                </Text>
                <Text style={styles.scannerInfoSubtext}>
                  {scannerTarget === 'l2send' ? 'L2 instant transfer address' : 'Bitcoin address'}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  networkIcon: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  networkName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  refreshButton: {
    padding: 8,
    marginRight: 4,
  },
  settingsButton: {
    padding: 8,
  },
  networkDropdown: {
    position: 'absolute',
    top: 65,
    left: 16,
    right: 100,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 8,
    zIndex: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
  },
  networkOptionActive: {
    backgroundColor: colors.backgroundCard,
  },
  networkOptionIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  networkOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  addressCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    letterSpacing: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  balanceUnit: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.textMuted,
  },
  balanceBTC: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 6,
  },
  pendingBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBalanceText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  actionButtonAlt: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.buttonSecondaryBorder,
  },
  actionButtonTextAlt: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.buttonSecondaryText,
  },
  defiButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  defiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  defiIcon: {
    fontSize: 16,
  },
  defiButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.buttonPrimary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.buttonPrimaryText,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // L2 Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
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
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
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
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tokenOptionActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: '#8b5cf6',
  },
  tokenOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tokenOptionTextActive: {
    color: '#8b5cf6',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textMuted,
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
    color: colors.error,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 10,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    color: colors.success,
    flex: 1,
  },
  l2SendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  l2SendButtonDisabled: {
    opacity: 0.6,
  },
  l2SendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.buttonPrimaryText,
  },
  feeNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // L2 Receive Modal
  receiveAddressBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiveAddressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  receiveAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiveAddress: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
    backgroundColor: colors.backgroundCard,
    borderRadius: 8,
  },
  copiedText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 8,
  },
  receiveInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    marginBottom: 16,
  },
  receiveInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 20,
  },
  acceptedTokens: {
    marginTop: 8,
  },
  acceptedTokensLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  tokenList: {
    flexDirection: 'row',
    gap: 8,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundCard,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenBadgeIcon: {
    fontSize: 14,
  },
  tokenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // Deposit Modal
  depositBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  depositLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  depositAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  depositAddressShort: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  depositAddressFull: {
    marginTop: 10,
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  depositAddress: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  depositInfoBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  depositInfoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  depositInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  depositInfoNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  rateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    marginBottom: 16,
  },
  rateLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  depositNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
  },
  depositNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
  },
  // Withdraw Modal
  withdrawDestination: {
    marginBottom: 16,
  },
  withdrawAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  withdrawAddressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  withdrawAddressNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  withdrawEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    marginBottom: 20,
  },
  withdrawEstLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  withdrawEstValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  withdrawNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Address input with scan button
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // QR Code container for receive
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#000',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  // QR Scanner styles
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
