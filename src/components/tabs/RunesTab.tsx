/**
 * Runes Tab Component
 * Display user's runes with Transfer and List for Sale functionality
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { WebQRScanner } from '../WebQRScanner';
import * as api from '../../services/api';

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
  // Signing function for List for Sale
  onSignPsbt?: (psbtBase64: string, password: string, sighashType?: number) => Promise<string | null>;
  // External success state (elevated to parent to survive re-renders)
  externalSuccessTxid?: string | null;
  onClearSuccess?: () => void;
}

export function RunesTab({ runes, walletAddress, onTransfer, onSignPsbt, externalSuccessTxid, onClearSuccess }: RunesTabProps) {
  // Action Selector Modal (Send vs List for Sale)
  const [showActionModal, setShowActionModal] = useState(false);
  
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedRune, setSelectedRune] = useState<Rune | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  
  // List for Sale Modal State
  const [showListModal, setShowListModal] = useState(false);
  const [listAmount, setListAmount] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listPassword, setListPassword] = useState('');
  const [showListPassword, setShowListPassword] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [listError, setListError] = useState('');
  const [listSuccess, setListSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  // Use external success txid if available (survives re-renders)
  const [localSuccessTxid, setLocalSuccessTxid] = useState<string | null>(null);
  const successTxid = externalSuccessTxid || localSuccessTxid;
  const [copiedTxid, setCopiedTxid] = useState(false);
  
  // QR Scanner State
  const [showScanner, setShowScanner] = useState(false);

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

  // Open Action Selector Modal
  const handleRunePress = (rune: Rune) => {
    setSelectedRune(rune);
    setShowActionModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Open Transfer Modal from Action Selector
  const openTransferModal = () => {
    setShowActionModal(false);
    setTransferTo('');
    setTransferAmount('');
    setPassword('');
    setTransferError('');
    setLocalSuccessTxid(null);
    if (onClearSuccess) {
      onClearSuccess();
    }
    setCopiedTxid(false);
    setShowTransferModal(true);
  };
  
  // Open List for Sale Modal from Action Selector
  const openListModal = () => {
    setShowActionModal(false);
    setListAmount('');
    setListPrice('');
    setListPassword('');
    setListError('');
    setListSuccess(false);
    setShowListModal(true);
  };
  
  // Handle List for Sale
  const handleListForSale = async () => {
    if (!selectedRune || !walletAddress || !onSignPsbt) return;
    
    if (!listAmount || parseFloat(listAmount) <= 0) {
      setListError('Please enter a valid amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (!listPrice || parseInt(listPrice) < 546) {
      setListError('Price must be at least 546 sats');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    const maxAmount = selectedRune.formattedAmount 
      ? parseFloat(selectedRune.formattedAmount.replace(/,/g, ''))
      : (selectedRune.balance || 0) / Math.pow(10, selectedRune.divisibility || 0);
    
    if (parseFloat(listAmount) > maxAmount) {
      setListError('Amount exceeds available balance');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (!listPassword) {
      setListError('Please enter your password to sign');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    // Get UTXO info
    const utxo = selectedRune.utxos?.[0];
    if (!utxo) {
      setListError('No UTXO found for this rune. Please try again later.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setIsListing(true);
    setListError('');
    
    try {
      console.log('🪙 Creating rune listing...');
      console.log('   Rune:', selectedRune.name);
      console.log('   Amount:', listAmount);
      console.log('   Price:', listPrice, 'sats');
      
      // Calculate raw amounts
      const rawSellAmount = Math.floor(parseFloat(listAmount) * Math.pow(10, selectedRune.divisibility || 0));
      const rawTotalAmount = selectedRune.rawAmount || rawSellAmount;
      
      // Get script pubkey from mempool
      const txRes = await fetch(`https://mempool.space/api/tx/${utxo.txid}`);
      const txData = await txRes.json();
      const scriptPubKey = txData.vout[utxo.vout].scriptpubkey;
      const sellerValue = txData.vout[utxo.vout].value;
      
      console.log('   UTXO:', `${utxo.txid}:${utxo.vout}`);
      console.log('   Value:', sellerValue, 'sats');
      
      // Step 1: Create listing
      const createRes = await api.createRunesListing({
        runeId: selectedRune.runeId || selectedRune.id,
        runeName: selectedRune.name,
        runeSymbol: selectedRune.symbol,
        sellAmount: rawSellAmount.toString(),
        totalAmount: rawTotalAmount.toString(),
        divisibility: selectedRune.divisibility || 0,
        sellerTxid: utxo.txid,
        sellerVout: utxo.vout,
        sellerValue: sellerValue,
        sellerScriptPubKey: scriptPubKey,
        priceSats: parseInt(listPrice),
        sellerPayoutAddress: walletAddress,
      });
      
      if (!createRes.success || !createRes.psbt_base64 || !createRes.order_id) {
        throw new Error(createRes.error || 'Failed to create listing');
      }
      
      console.log('📝 Listing created, signing PSBT...');
      console.log('   Order ID:', createRes.order_id);
      
      // Step 2: Sign with SIGHASH_SINGLE|ANYONECANPAY (0x83)
      const signedPsbt = await onSignPsbt(createRes.psbt_base64, listPassword, 0x83);
      
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT. Check your password.');
      }
      
      console.log('✅ PSBT signed, submitting...');
      
      // Step 3: Submit signature
      const signRes = await api.signRunesListing({
        orderId: createRes.order_id,
        signedPsbtBase64: signedPsbt,
      });
      
      if (!signRes.success) {
        throw new Error(signRes.error || 'Failed to submit signature');
      }
      
      console.log('🎉 Listing created successfully!');
      
      setListSuccess(true);
      setListPassword('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto close after success
      setTimeout(() => {
        setShowListModal(false);
        setListSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ List for sale error:', error);
      setListError(error.message || 'Failed to create listing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsListing(false);
    }
  };
  
  // Handle List Max Amount
  const handleListMaxAmount = () => {
    if (selectedRune) {
      const maxAmount = formatBalance(selectedRune.balance, selectedRune.divisibility || 0, selectedRune.formattedAmount);
      setListAmount(maxAmount.replace(/,/g, ''));
    }
  };
  
  // Calculate price per token
  const pricePerToken = () => {
    if (!listAmount || !listPrice) return '--';
    const amount = parseFloat(listAmount);
    const price = parseInt(listPrice);
    if (amount <= 0 || price <= 0) return '--';
    return (price / amount).toFixed(2);
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
          setLocalSuccessTxid(txid);
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
    setLocalSuccessTxid(null);
    // Clear external success state if provided
    if (onClearSuccess) {
      onClearSuccess();
    }
  };

  // Handle Max button
  const handleMaxAmount = () => {
    if (selectedRune) {
      const maxAmount = formatBalance(selectedRune.balance, selectedRune.divisibility || 0, selectedRune.formattedAmount);
      setTransferAmount(maxAmount.replace(/,/g, ''));
    }
  };

  // Handle QR Scan
  const handleQRScan = (data: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Parse bitcoin: URI if present
    let address = data;
    if (data.toLowerCase().startsWith('bitcoin:')) {
      address = data.slice(8).split('?')[0];
    }
    
    setTransferTo(address);
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
                {selectedRune?.thumbnail ? (
                  <Image 
                    source={{ uri: selectedRune.thumbnail }} 
                    style={styles.runeThumbnailLarge}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.runeSymbolLarge}>{selectedRune?.symbol || '◆'}</Text>
                )}
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
                <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
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
                  onPress={() => Linking.openURL(`https://kray.space/krayscan.html?txid=${successTxid}`)}
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

      {/* Action Selector Modal (Send vs List for Sale) */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionModalContent}>
            {/* Rune Info */}
            <View style={styles.actionRuneInfo}>
              <View style={styles.runeIconLarge}>
                {selectedRune?.thumbnail ? (
                  <Image 
                    source={{ uri: selectedRune.thumbnail }} 
                    style={styles.runeThumbnailLarge}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.runeSymbolLarge}>{selectedRune?.symbol || '◆'}</Text>
                )}
              </View>
              <Text style={styles.actionRuneName}>{selectedRune?.name}</Text>
              <Text style={styles.actionRuneBalance}>
                {selectedRune && formatBalance(selectedRune.balance, selectedRune.divisibility || 0, selectedRune.formattedAmount)} {selectedRune?.symbol}
              </Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={openTransferModal}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons name="arrow-up" size={24} color="#10b981" />
                </View>
                <Text style={styles.actionButtonText}>Send</Text>
                <Text style={styles.actionButtonHint}>Transfer to another wallet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={openListModal}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: 'rgba(255, 107, 53, 0.2)' }]}>
                  <Ionicons name="pricetag" size={24} color="#ff6b35" />
                </View>
                <Text style={styles.actionButtonText}>List for Sale</Text>
                <Text style={styles.actionButtonHint}>Sell on Runes Market</Text>
              </TouchableOpacity>
            </View>
            
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.actionCloseButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.actionCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* List for Sale Modal */}
      <Modal
        visible={showListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.listModalScroll}
            contentContainerStyle={styles.listModalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  🪙 List {selectedRune?.symbol || selectedRune?.name || 'Rune'} for Sale
                </Text>
                <TouchableOpacity onPress={() => setShowListModal(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Success State */}
              {listSuccess ? (
                <View style={styles.successScreen}>
                  <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                  <Text style={styles.successTitle}>Listing Created!</Text>
                  <Text style={styles.successSubtitle}>
                    Your runes are now listed on the market
                  </Text>
                  <Text style={styles.listSuccessNote}>
                    View your listing in the Market tab
                  </Text>
                </View>
              ) : (
                <>
                  {/* Rune Info */}
                  <View style={styles.runeInfoCard}>
                    <View style={styles.runeIconLarge}>
                      {selectedRune?.thumbnail ? (
                        <Image 
                          source={{ uri: selectedRune.thumbnail }} 
                          style={styles.runeThumbnailLarge}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.runeSymbolLarge}>{selectedRune?.symbol || '◆'}</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.runeNameLarge}>{selectedRune?.name}</Text>
                      <Text style={styles.runeBalanceLarge}>
                        Available: {selectedRune && formatBalance(selectedRune.balance, selectedRune.divisibility || 0, selectedRune.formattedAmount)}
                      </Text>
                    </View>
                  </View>

                  {/* Amount to Sell */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>AMOUNT TO SELL</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="0"
                        placeholderTextColor="#666"
                        value={listAmount}
                        onChangeText={setListAmount}
                        keyboardType="decimal-pad"
                      />
                      <TouchableOpacity style={styles.maxButton} onPress={handleListMaxAmount}>
                        <Text style={styles.maxButtonText}>MAX</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Price in Sats */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>TOTAL PRICE (SATS)</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Minimum 546 sats"
                        placeholderTextColor="#666"
                        value={listPrice}
                        onChangeText={setListPrice}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.satsLabel}>sats</Text>
                    </View>
                    <Text style={styles.pricePerTokenHint}>
                      Price per token: {pricePerToken()} sats
                    </Text>
                  </View>

                  {/* Error */}
                  {listError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{listError}</Text>
                    </View>
                  ) : null}

                  {/* Password */}
                  <View style={styles.passwordSection}>
                    <Text style={styles.passwordLabel}>🔑 ENTER PASSWORD TO SIGN</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Your wallet password"
                        placeholderTextColor="#666"
                        value={listPassword}
                        onChangeText={setListPassword}
                        secureTextEntry={!showListPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setShowListPassword(!showListPassword)}
                      >
                        <Ionicons 
                          name={showListPassword ? "eye-off" : "eye"} 
                          size={20} 
                          color="#666" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Create Listing Button */}
                  <TouchableOpacity
                    style={[styles.listButton, isListing && styles.transferButtonDisabled]}
                    onPress={handleListForSale}
                    disabled={isListing}
                  >
                    {isListing ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Ionicons name="pricetag" size={20} color="#000" />
                        <Text style={styles.listButtonText}>Create Listing</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Info Note */}
                  <Text style={styles.listNote}>
                    Your runes will be listed on the KRAY Runes Market.{'\n'}
                    A 2% market fee applies when sold.
                  </Text>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* QR Scanner */}
      <WebQRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        title="Scan Address"
        hint="Scan recipient's Bitcoin address"
      />
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
  runeThumbnailLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
  // Action Modal Styles
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContent: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionRuneInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionRuneName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  actionRuneBalance: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionButtonHint: {
    fontSize: 13,
    color: '#888',
  },
  actionCloseButton: {
    marginTop: 16,
    padding: 12,
  },
  actionCloseText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
  // List for Sale Modal Styles
  listModalScroll: {
    flex: 1,
  },
  listModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  satsLabel: {
    fontSize: 14,
    color: '#888',
    marginLeft: 12,
    fontWeight: '600',
  },
  pricePerTokenHint: {
    fontSize: 12,
    color: '#f7931a',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ff6b35',
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  listButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  listNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  listSuccessNote: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 16,
    fontWeight: '600',
  },
});
