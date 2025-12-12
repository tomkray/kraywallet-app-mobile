/**
 * Ordinals Tab Component
 * Display user's inscriptions with Transfer and List functionality
 * KRAY OS Style - Same as extension production
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as api from '../../services/api';
import { useWallet } from '../../context/WalletContext';
import { WebQRScanner } from '../WebQRScanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Ordinal {
  id: string;
  number: number;
  contentType: string;
  contentUrl?: string;
  preview?: string;
  content?: string;
  thumbnail?: string;
}

interface OrdinalsTabProps {
  ordinals: Ordinal[];
  walletAddress?: string;
  onTransfer?: (ordinal: Ordinal, toAddress: string, password: string) => Promise<string>;
  onListForSale?: (ordinal: Ordinal, priceSats: number, password: string) => Promise<string>;
}

export function OrdinalsTab({ ordinals, walletAddress, onTransfer, onListForSale }: OrdinalsTabProps) {
  // Get signPsbt from wallet context for listing flow
  const { signPsbt } = useWallet();
  
  // Listing step state for better UX
  const [listingStep, setListingStep] = useState<'idle' | 'creating' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [listingStepMessage, setListingStepMessage] = useState('');
  
  // Listings state - track which inscriptions are listed
  const [listings, setListings] = useState<Map<string, api.BuyNowListing>>(new Map());
  const [loadingListings, setLoadingListings] = useState(false);
  
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedOrdinal, setSelectedOrdinal] = useState<Ordinal | null>(null);
  const [modalMode, setModalMode] = useState<'send' | 'list'>('send');
  const [transferTo, setTransferTo] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [successTxid, setSuccessTxid] = useState<string | null>(null);
  const [copiedTxid, setCopiedTxid] = useState(false);
  
  // QR Scanner State
  const [showScanner, setShowScanner] = useState(false);
  
  // Edit Price Modal State
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [editingOrdinal, setEditingOrdinal] = useState<Ordinal | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceStep, setEditPriceStep] = useState<'input' | 'cancelling' | 'creating' | 'signing' | 'confirming' | 'success' | 'error'>('input');
  const [editPriceMessage, setEditPriceMessage] = useState('');
  
  // Cancel Listing Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrdinal, setCancellingOrdinal] = useState<Ordinal | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Load listings on mount
  const loadListings = useCallback(async () => {
    if (!walletAddress) {
      console.log('⚠️ OrdinalsTab: No wallet address');
      return;
    }
    setLoadingListings(true);
    try {
      console.log('📦 OrdinalsTab: Loading listings for', walletAddress);
      const myListings = await api.getMyMarketListings(walletAddress);
      console.log('   Found listings:', myListings.length);
      
      const listingMap = new Map<string, api.BuyNowListing>();
      for (const listing of myListings) {
        console.log(`   Listing: ${listing.inscription_id?.slice(0,10)}... status=${listing.status} seller=${listing.seller_address?.slice(0,10)}...`);
        if (listing.status === 'OPEN') {
          listingMap.set(listing.inscription_id, listing);
        }
      }
      console.log('   Active listings map:', listingMap.size);
      setListings(listingMap);
    } catch (e) {
      console.warn('Failed to load listings:', e);
    } finally {
      setLoadingListings(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Check if an ordinal is listed
  const isListed = (ordinalId: string): boolean => listings.has(ordinalId);
  const getListing = (ordinalId: string): api.BuyNowListing | undefined => listings.get(ordinalId);

  if (ordinals.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>◉</Text>
        <Text style={styles.emptyTitle}>No Inscriptions</Text>
        <Text style={styles.emptyText}>
          Your Ordinals inscriptions will appear here
        </Text>
        
        {/* Inscribe Button */}
        <TouchableOpacity style={styles.inscribeButton}>
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.inscribeButtonText}>Inscribe New Ordinal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Open Transfer Modal
  const handleOrdinalPress = (ordinal: Ordinal) => {
    setSelectedOrdinal(ordinal);
    setModalMode('send');
    setTransferTo('');
    setListingPrice('');
    setPassword('');
    setTransferError('');
    setSuccessTxid(null);
    setCopiedTxid(false);
    setListingStep('idle');
    setListingStepMessage('');
    setShowTransferModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle List for Sale - Complete flow with visual feedback
  const handleListForSale = async () => {
    if (!selectedOrdinal || !listingPrice || !password || !walletAddress) {
      setTransferError('Please fill all fields');
      return;
    }

    const priceSats = parseInt(listingPrice);
    if (isNaN(priceSats) || priceSats < 546) {
      setTransferError('Price must be at least 546 sats');
      return;
    }

    setIsTransferring(true);
    setTransferError('');
    setListingStep('creating');
    setListingStepMessage('Creating listing...');

    try {
      // ═══════════════════════════════════════════════════════════════
      // STEP 1: Create listing PSBT
      // ═══════════════════════════════════════════════════════════════
      console.log('📝 Step 1: Creating listing PSBT...');
      const response = await api.createBuyNowListing({
        inscription_id: selectedOrdinal.id,
        price_sats: priceSats,
        seller_address: walletAddress,
        inscription_number: selectedOrdinal.number,
        content_type: selectedOrdinal.contentType,
      });

      if (!response.success || !response.psbt_base64 || !response.order_id) {
        throw new Error(response.error || 'Failed to create listing');
      }

      console.log('✅ Listing PSBT created, order:', response.order_id);

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: Sign PSBT with SIGHASH_NONE|ANYONECANPAY (0x82)
      // ═══════════════════════════════════════════════════════════════
      setListingStep('signing');
      setListingStepMessage('Signing transaction...');
      console.log('🔏 Step 2: Signing PSBT with SIGHASH 0x82...');

      const signedPsbt = await signPsbt(response.psbt_base64, password, 0x82);
      
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT');
      }
      
      console.log('✅ PSBT signed successfully');

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: Confirm listing with signed PSBT
      // ═══════════════════════════════════════════════════════════════
      setListingStep('confirming');
      setListingStepMessage('Confirming listing...');
      console.log('📤 Step 3: Confirming listing...');

      const confirmResponse = await api.confirmBuyNowListing({
        order_id: response.order_id,
        signed_psbt: signedPsbt,
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || 'Failed to confirm listing');
      }

      console.log('🎉 Listing confirmed! Order:', response.order_id);

      // ═══════════════════════════════════════════════════════════════
      // SUCCESS!
      // ═══════════════════════════════════════════════════════════════
      setListingStep('success');
      setListingStepMessage('Listed successfully!');
      setSuccessTxid(response.order_id);
      loadListings(); // Refresh listings
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

    } catch (error: any) {
      console.error('❌ List error:', error);
      setListingStep('error');
      setListingStepMessage(error.message || 'Failed to list inscription');
      setTransferError(error.message || 'Failed to list inscription');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle Cancel Listing
  const handleCancelListing = (ordinal: Ordinal) => {
    if (!walletAddress) return;
    
    const listing = getListing(ordinal.id);
    if (!listing) return;

    setCancellingOrdinal(ordinal);
    setCancelError('');
    setShowCancelModal(true);
  };
  
  const confirmCancelListing = async () => {
    if (!walletAddress || !cancellingOrdinal) return;
    
    const listing = getListing(cancellingOrdinal.id);
    if (!listing) return;
    
    setIsCancelling(true);
    setCancelError('');
    
    try {
      const result = await api.cancelBuyNowListing({
        orderId: listing.order_id,
        sellerAddress: walletAddress,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel listing');
      }
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setShowCancelModal(false);
      setCancellingOrdinal(null);
      loadListings();
      setShowTransferModal(false);
    } catch (e: any) {
      setCancelError(e.message || 'Failed to cancel listing');
    } finally {
      setIsCancelling(false);
    }
  };
  

  // Handle Edit Price - Opens modal to change listing price
  const handleEditPrice = (ordinal: Ordinal) => {
    const listing = getListing(ordinal.id);
    if (!listing) return;
    
    setEditingOrdinal(ordinal);
    setNewPrice(listing.price_sats.toString());
    setEditPassword('');
    setEditPriceStep('input');
    setEditPriceMessage('');
    setShowEditPriceModal(true);
  };

  // Confirm Edit Price - Cancel old listing and create new one
  const confirmEditPrice = async () => {
    if (!editingOrdinal || !walletAddress || !newPrice || !editPassword) {
      setEditPriceMessage('Please fill all fields');
      return;
    }

    const priceSats = parseInt(newPrice);
    if (isNaN(priceSats) || priceSats < 546) {
      setEditPriceMessage('Price must be at least 546 sats');
      return;
    }

    const listing = getListing(editingOrdinal.id);
    if (!listing) {
      setEditPriceMessage('Listing not found');
      return;
    }

    setIsEditingPrice(true);
    setEditPriceMessage('');

    try {
      // STEP 1: Cancel existing listing
      setEditPriceStep('cancelling');
      setEditPriceMessage('Cancelling old listing...');
      
      await api.cancelBuyNowListing({
        orderId: listing.order_id,
        sellerAddress: walletAddress,
      });
      
      // STEP 2: Create new listing with new price
      setEditPriceStep('creating');
      setEditPriceMessage('Creating new listing...');
      
      const response = await api.createBuyNowListing({
        inscription_id: editingOrdinal.id,
        price_sats: priceSats,
        seller_address: walletAddress,
        inscription_number: editingOrdinal.number,
        content_type: editingOrdinal.contentType,
      });

      if (!response.success || !response.psbt_base64 || !response.order_id) {
        throw new Error(response.error || 'Failed to create listing');
      }

      // STEP 3: Sign PSBT with SIGHASH_NONE|ANYONECANPAY (0x82)
      setEditPriceStep('signing');
      setEditPriceMessage('Signing transaction...');
      
      const signedPsbt = await signPsbt(response.psbt_base64, editPassword, 0x82);
      
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT');
      }
      
      // STEP 4: Confirm listing with signed PSBT
      setEditPriceStep('confirming');
      setEditPriceMessage('Confirming listing...');
      
      const confirmResponse = await api.confirmBuyNowListing({
        order_id: response.order_id,
        signed_psbt: signedPsbt,
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || 'Failed to confirm listing');
      }

      setEditPriceStep('success');
      setEditPriceMessage(`Price updated to ${priceSats.toLocaleString()} sats!`);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Refresh listings
      loadListings();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowEditPriceModal(false);
        setShowTransferModal(false);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Edit price error:', error);
      setEditPriceStep('error');
      setEditPriceMessage(error.message || 'Failed to update price');
    } finally {
      setIsEditingPrice(false);
    }
  };

  // Handle Transfer
  // Validate Bitcoin address
  const isValidBitcoinAddress = (address: string): boolean => {
    // Taproot (bc1p)
    if (/^bc1p[a-z0-9]{58}$/i.test(address)) return true;
    // SegWit (bc1q)
    if (/^bc1q[a-z0-9]{38,42}$/i.test(address)) return true;
    // Legacy P2PKH (1...)
    if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
    // Legacy P2SH (3...)
    if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
    // Testnet
    if (/^(tb1|m|n|2)[a-zA-Z0-9]{25,62}$/i.test(address)) return true;
    return false;
  };

  const handleTransfer = async () => {
    if (!selectedOrdinal || !transferTo || !password) {
      setTransferError('Please fill all fields');
      return;
    }

    // Validate address format
    if (!isValidBitcoinAddress(transferTo.trim())) {
      setTransferError('Invalid Bitcoin address. Please enter a valid bc1p, bc1q, 1, or 3 address.');
      return;
    }

    if (!onTransfer) {
      setTransferError('Transfer not available');
      return;
    }

    setIsTransferring(true);
    setTransferError('');

    try {
      console.log('📤 Starting inscription transfer...');
      const txid = await onTransfer(selectedOrdinal, transferTo, password);
      console.log('✅ Transfer result txid:', txid);
      
      if (txid) {
        setSuccessTxid(txid);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // txid is undefined/null - show error
        setTransferError('Transaction sent but no TXID returned. Check Activity tab.');
      }
      // DON'T auto-close - let user see success screen with links
    } catch (error: any) {
      console.error('❌ Transfer error:', error);
      setTransferError(error.message || 'Transfer failed');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  // Copy TXID
  const copyTxid = async () => {
    if (successTxid) {
      await Clipboard.setStringAsync(successTxid);
      setCopiedTxid(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setTimeout(() => setCopiedTxid(false), 2000);
    }
  };

  // Close success and modal
  const handleDone = () => {
    setShowTransferModal(false);
    setSuccessTxid(null);
    setListingStep('idle');
    setListingStepMessage('');
  };

  // QR Scanner
  const handleQRScan = (data: string) => {
    let address = data;
    if (data.toLowerCase().startsWith('bitcoin:')) {
      address = data.replace(/^bitcoin:/i, '').split('?')[0];
    }
    setTransferTo(address);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    if (contentType?.startsWith('image/')) return '◉';
    if (contentType?.startsWith('text/')) return '◉';
    if (contentType?.startsWith('video/')) return '◉';
    if (contentType?.startsWith('audio/')) return '◉';
    if (contentType?.includes('html')) return '◉';
    return '◉';
  };

  const renderOrdinal = ({ item }: { item: Ordinal }) => {
    // Use thumbnail (which is /content/) or fallback to preview/content
    const imageUrl = item.thumbnail || item.preview || item.content;
    const hasImage = !!imageUrl;
    const listed = isListed(item.id);
    const listing = getListing(item.id);

    return (
      <TouchableOpacity style={styles.ordinalItem} onPress={() => handleOrdinalPress(item)}>
        <View style={styles.ordinalPreview}>
          {hasImage ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.ordinalImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.ordinalPlaceholder}>
              <Text style={styles.ordinalPlaceholderIcon}>
                {getContentTypeIcon(item.contentType)}
              </Text>
              <Text style={styles.ordinalPlaceholderText}>
                {item.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
              </Text>
            </View>
          )}
          {/* Listed Badge */}
          {listed && (
            <View style={styles.listedBadge}>
              <Text style={styles.listedBadgeText}>LISTED</Text>
            </View>
          )}
        </View>
        <View style={styles.ordinalInfo}>
          <Text style={styles.ordinalNumber}>#{item.number?.toLocaleString() || '?'}</Text>
          {listed && listing && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {(listing.price_sats / 1000).toFixed(0)}k sats
              </Text>
          </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Inscribe Button */}
      <TouchableOpacity style={styles.inscribeButtonTop}>
        <Ionicons name="add" size={20} color="#000" />
        <Text style={styles.inscribeButtonText}>Inscribe New Ordinal</Text>
      </TouchableOpacity>

      <FlatList
        data={ordinals}
        renderItem={renderOrdinal}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Transfer/List Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'send' ? 'Send Inscription' : 'List for Sale'}
              </Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedOrdinal && (
              <>
                {/* Inscription Preview */}
              <View style={styles.selectedOrdinal}>
                <View style={styles.ordinalPreviewLarge}>
                  {(selectedOrdinal.thumbnail || selectedOrdinal.preview || selectedOrdinal.content) ? (
                    <Image 
                      source={{ uri: selectedOrdinal.thumbnail || selectedOrdinal.preview || selectedOrdinal.content }} 
                      style={styles.ordinalImageLarge}
                    />
                  ) : (
                    <View style={styles.ordinalPlaceholderLarge}>
                      <Text style={styles.ordinalPlaceholderIcon}>
                        {getContentTypeIcon(selectedOrdinal.contentType)}
                      </Text>
                    </View>
                  )}
                    {isListed(selectedOrdinal.id) && (
                      <View style={styles.listedBadgeLarge}>
                        <Text style={styles.listedBadgeText}>LISTED</Text>
                      </View>
                    )}
                </View>
                <View style={styles.ordinalPreviewInfo}>
                  <Text style={styles.ordinalPreviewNumber}>
                    Inscription #{selectedOrdinal.number?.toLocaleString() || '?'}
                  </Text>
                  <Text style={styles.ordinalPreviewId} numberOfLines={1}>
                    {selectedOrdinal.id}
                  </Text>
                    {isListed(selectedOrdinal.id) && getListing(selectedOrdinal.id) && (
                      <Text style={styles.currentPriceText}>
                        Listed: {getListing(selectedOrdinal.id)!.price_sats.toLocaleString()} sats
                      </Text>
                    )}
                </View>
              </View>

                {/* Action Tabs - Send / List / Cancel */}
                {!successTxid && (
                  <View style={styles.actionTabs}>
                    <TouchableOpacity 
                      style={[styles.actionTab, modalMode === 'send' && styles.actionTabActive]}
                      onPress={() => { setModalMode('send'); setTransferError(''); }}
                    >
                      <Ionicons name="arrow-up" size={16} color={modalMode === 'send' ? '#000' : '#888'} />
                      <Text style={[styles.actionTabText, modalMode === 'send' && styles.actionTabTextActive]}>Send</Text>
                    </TouchableOpacity>
                    
                    {isListed(selectedOrdinal.id) ? (
                      <>
                        {/* Edit Price Button */}
                        <TouchableOpacity 
                          style={styles.editPriceTab}
                          onPress={() => handleEditPrice(selectedOrdinal)}
                        >
                          <Ionicons name="pencil" size={16} color="#f7931a" />
                          <Text style={styles.editPriceTabText}>Edit</Text>
                        </TouchableOpacity>
                        
                        {/* Cancel Listing Button */}
                        <TouchableOpacity 
                          style={styles.cancelListingTab}
                          onPress={() => handleCancelListing(selectedOrdinal)}
                        >
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                          <Text style={styles.cancelListingTabText}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.actionTab, modalMode === 'list' && styles.actionTabActive]}
                        onPress={() => { setModalMode('list'); setTransferError(''); }}
                      >
                        <Ionicons name="pricetag" size={16} color={modalMode === 'list' ? '#000' : '#888'} />
                        <Text style={[styles.actionTabText, modalMode === 'list' && styles.actionTabTextActive]}>List</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}

            {/* SEND MODE */}
            {modalMode === 'send' && !successTxid && (
              <>
                {/* Warning when inscription is listed */}
                {selectedOrdinal && isListed(selectedOrdinal.id) && (
                  <View style={styles.listedWarning}>
                    <Ionicons name="lock-closed" size={20} color="#f7931a" />
                    <View style={styles.listedWarningText}>
                      <Text style={styles.listedWarningTitle}>Inscription is Listed</Text>
                      <Text style={styles.listedWarningDesc}>
                        Cancel the listing first to send this inscription.
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={[styles.inputGroup, selectedOrdinal && isListed(selectedOrdinal.id) && styles.inputDisabled]}>
              <Text style={styles.inputLabel}>Recipient Address</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                      style={[styles.input, selectedOrdinal && isListed(selectedOrdinal.id) && styles.inputTextDisabled]}
                  placeholder="bc1p... or tb1..."
                  placeholderTextColor="#666"
                  value={transferTo}
                  onChangeText={setTransferTo}
                  autoCapitalize="none"
                  autoCorrect={false}
                      editable={!selectedOrdinal || !isListed(selectedOrdinal.id)}
                />
                    <TouchableOpacity 
                      style={[styles.scanButton, selectedOrdinal && isListed(selectedOrdinal.id) && styles.buttonDisabled]} 
                      onPress={() => setShowScanner(true)}
                      disabled={selectedOrdinal && isListed(selectedOrdinal.id)}
                    >
                      <Ionicons name="qr-code" size={20} color={selectedOrdinal && isListed(selectedOrdinal.id) ? '#444' : '#fff'} />
                </TouchableOpacity>
              </View>
                </View>

                <View style={[styles.inputGroup, selectedOrdinal && isListed(selectedOrdinal.id) && styles.inputDisabled]}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWithButton}>
                    <TextInput
                      style={[styles.input, selectedOrdinal && isListed(selectedOrdinal.id) && styles.inputTextDisabled]}
                      placeholder="Enter your password"
                      placeholderTextColor="#666"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!selectedOrdinal || !isListed(selectedOrdinal.id)}
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton} 
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={selectedOrdinal && isListed(selectedOrdinal.id)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color={selectedOrdinal && isListed(selectedOrdinal.id) ? '#444' : '#666'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* LIST MODE */}
            {modalMode === 'list' && !successTxid && (
              <>
                {/* Progress Steps Indicator */}
                {isTransferring && listingStep !== 'idle' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressSteps}>
                      <View style={[styles.progressStep, listingStep === 'creating' && styles.progressStepActive]}>
                        <View style={[styles.progressDot, listingStep === 'creating' ? styles.progressDotActive : (listingStep !== 'idle' ? styles.progressDotDone : {})]}>
                          {listingStep === 'creating' ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : listingStep !== 'idle' ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          ) : null}
                        </View>
                        <Text style={styles.progressLabel}>Creating</Text>
                      </View>
                      
                      <View style={[styles.progressLine, (listingStep === 'signing' || listingStep === 'confirming' || listingStep === 'success') && styles.progressLineDone]} />
                      
                      <View style={[styles.progressStep, listingStep === 'signing' && styles.progressStepActive]}>
                        <View style={[styles.progressDot, listingStep === 'signing' ? styles.progressDotActive : (listingStep === 'confirming' || listingStep === 'success' ? styles.progressDotDone : {})]}>
                          {listingStep === 'signing' ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (listingStep === 'confirming' || listingStep === 'success') ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          ) : null}
                        </View>
                        <Text style={styles.progressLabel}>Signing</Text>
                      </View>
                      
                      <View style={[styles.progressLine, listingStep === 'success' && styles.progressLineDone]} />
                      
                      <View style={[styles.progressStep, listingStep === 'confirming' && styles.progressStepActive]}>
                        <View style={[styles.progressDot, listingStep === 'confirming' ? styles.progressDotActive : (listingStep === 'success' ? styles.progressDotDone : {})]}>
                          {listingStep === 'confirming' ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : listingStep === 'success' ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          ) : null}
                        </View>
                        <Text style={styles.progressLabel}>Confirming</Text>
                      </View>
                    </View>
                    <Text style={styles.progressMessage}>{listingStepMessage}</Text>
                  </View>
                )}

                {!isTransferring && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price (sats)</Text>
                      <TextInput
                        style={styles.inputFull}
                        placeholder="e.g. 100000"
                        placeholderTextColor="#666"
                        value={listingPrice}
                        onChangeText={setListingPrice}
                        keyboardType="numeric"
                      />
                      {listingPrice && parseInt(listingPrice) > 0 && (
                        <Text style={styles.priceHint}>
                          = {(parseInt(listingPrice) / 100000000).toFixed(8)} BTC
                        </Text>
                      )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
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
                
                    <View style={styles.feeNotice}>
                      <Ionicons name="information-circle-outline" size={16} color="#888" />
                      <Text style={styles.feeNoticeText}>2% marketplace fee on sale</Text>
                    </View>
                  </>
                )}
              </>
            )}

            {transferError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ff4444" />
                <Text style={styles.errorText}>{transferError}</Text>
              </View>
            ) : null}

            {/* SUCCESS SCREEN WITH LINKS */}
            {successTxid ? (
              <View style={styles.successScreen}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                <Text style={styles.successTitle}>
                  {modalMode === 'send' ? 'Transaction Broadcast!' : 'Listed Successfully!'}
                </Text>
                <Text style={styles.successSubtitle}>
                  {modalMode === 'send' 
                    ? 'Your inscription is being transferred'
                    : 'Your inscription is now on the market'}
                </Text>
                
                <Text style={styles.txidLabel}>{modalMode === 'send' ? 'TRANSACTION ID' : 'ORDER ID'}</Text>
                <View style={styles.txidBox}>
                  <Text style={styles.txidText}>{successTxid.slice(0, 20)}...{successTxid.slice(-8)}</Text>
                  <TouchableOpacity onPress={copyTxid} style={styles.copyButton}>
                    <Ionicons name={copiedTxid ? "checkmark" : "copy"} size={18} color="#f7931a" />
                  </TouchableOpacity>
                </View>
                
                {modalMode === 'send' && (
                  <>
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
                  </>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                modalMode === 'list' ? styles.listButton : styles.transferButton, 
                isTransferring && styles.transferButtonDisabled,
                modalMode === 'send' && selectedOrdinal && isListed(selectedOrdinal.id) && styles.transferButtonDisabled
              ]}
              onPress={successTxid ? handleDone : (modalMode === 'send' ? handleTransfer : handleListForSale)}
              disabled={isTransferring || (modalMode === 'send' && selectedOrdinal && isListed(selectedOrdinal.id))}
            >
              {isTransferring ? (
                <ActivityIndicator color="#000" />
              ) : successTxid ? (
                <Text style={styles.transferButtonText}>✓ Done</Text>
              ) : modalMode === 'list' ? (
                <>
                  <Ionicons name="pricetag" size={20} color="#000" />
                  <Text style={styles.transferButtonText}>List for Sale</Text>
                </>
              ) : (
                <>
                  <Ionicons name={selectedOrdinal && isListed(selectedOrdinal.id) ? "lock-closed" : "arrow-up"} size={20} color={selectedOrdinal && isListed(selectedOrdinal.id) ? '#666' : '#000'} />
                  <Text style={[styles.transferButtonText, selectedOrdinal && isListed(selectedOrdinal.id) && { color: '#666' }]}>
                    {selectedOrdinal && isListed(selectedOrdinal.id) ? 'Cancel Listing First' : 'Send Inscription'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Price Modal */}
      <Modal
        visible={showEditPriceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isEditingPrice && setShowEditPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Price</Text>
              {!isEditingPrice && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowEditPriceModal(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
              )}
          </View>
          
            {/* Content */}
            {editPriceStep === 'success' ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                </View>
                <Text style={styles.successText}>Price Updated!</Text>
                <Text style={styles.successSubtext}>{editPriceMessage}</Text>
              </View>
            ) : editPriceStep !== 'input' ? (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color="#f7931a" />
                <Text style={styles.progressText}>{editPriceMessage}</Text>
                <View style={styles.progressSteps}>
                  <View style={[styles.progressStep, editPriceStep !== 'input' && styles.progressStepActive]}>
                    <Text style={styles.progressStepText}>1. Cancel</Text>
                  </View>
                  <View style={[styles.progressStep, ['creating', 'signing', 'confirming'].includes(editPriceStep) && styles.progressStepActive]}>
                    <Text style={styles.progressStepText}>2. Create</Text>
                  </View>
                  <View style={[styles.progressStep, ['signing', 'confirming'].includes(editPriceStep) && styles.progressStepActive]}>
                    <Text style={styles.progressStepText}>3. Sign</Text>
                  </View>
                  <View style={[styles.progressStep, editPriceStep === 'confirming' && styles.progressStepActive]}>
                    <Text style={styles.progressStepText}>4. Confirm</Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                {/* Ordinal Info */}
                {editingOrdinal && (
                  <View style={styles.ordinalInfoCard}>
                    <View style={styles.ordinalThumbnailSmall}>
                      <Image
                        source={{ uri: `https://ordinals.com/content/${editingOrdinal.id}` }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
            </View>
                    <View style={styles.ordinalInfoText}>
                      <Text style={styles.ordinalInfoNumber}>#{editingOrdinal.number?.toLocaleString()}</Text>
                      <Text style={styles.ordinalInfoType}>{editingOrdinal.contentType || 'Inscription'}</Text>
          </View>
                  </View>
                )}

                {/* Current Price */}
                {editingOrdinal && getListing(editingOrdinal.id) && (
                  <View style={styles.currentPriceContainer}>
                    <Text style={styles.currentPriceLabel}>Current Price</Text>
                    <Text style={styles.currentPriceValue}>
                      {getListing(editingOrdinal.id)!.price_sats.toLocaleString()} sats
          </Text>
                  </View>
                )}

                {/* New Price Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Price (sats)</Text>
                  <TextInput
                    style={styles.inputFull}
                    placeholder="Enter new price in sats"
                    placeholderTextColor="#666"
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="number-pad"
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.inputFull}
                    placeholder="Enter your password"
                    placeholderTextColor="#666"
                    value={editPassword}
                    onChangeText={setEditPassword}
                    secureTextEntry
                  />
                </View>

                {/* Error Message */}
                {editPriceMessage && editPriceStep === 'error' && (
                  <Text style={styles.errorText}>{editPriceMessage}</Text>
                )}

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[styles.transferButton, (!newPrice || !editPassword) && styles.buttonDisabled]}
                  onPress={confirmEditPrice}
                  disabled={!newPrice || !editPassword || isEditingPrice}
                >
                  <Ionicons name="checkmark" size={20} color="#000" />
                  <Text style={styles.transferButtonText}>Update Price</Text>
                </TouchableOpacity>

                {/* Info Note */}
                <Text style={styles.editPriceNote}>
                  This will cancel the current listing and create a new one with the updated price. 
                  You will need to sign the new transaction.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Listing Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isCancelling && setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 380 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Listing</Text>
              {!isCancelling && (
                <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {cancellingOrdinal && (
              <View style={styles.selectedOrdinal}>
                <Image
                  source={{ uri: `https://ordinals.com/content/${cancellingOrdinal.id}` }}
                  style={styles.ordinalPreviewImage}
                  resizeMode="cover"
                />
                <View style={styles.ordinalPreviewInfo}>
                  <Text style={styles.ordinalPreviewNumber}>
                    #{cancellingOrdinal.number?.toLocaleString()}
                  </Text>
                  <Text style={styles.ordinalPreviewId} numberOfLines={1}>
                    {cancellingOrdinal.id}
                  </Text>
                  {getListing(cancellingOrdinal.id) && (
                    <Text style={styles.currentPriceText}>
                      Listed: {getListing(cancellingOrdinal.id)!.price_sats.toLocaleString()} sats
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Text style={styles.cancelWarningText}>
              Are you sure you want to cancel this listing? The inscription will be removed from the marketplace.
            </Text>

            {cancelError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{cancelError}</Text>
              </View>
            ) : null}

            <View style={styles.cancelModalButtons}>
              <TouchableOpacity
                style={styles.cancelModalNoBtn}
                onPress={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelModalNoBtnText}>Keep Listed</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cancelModalYesBtn, isCancelling && styles.buttonDisabledStyle]}
                onPress={confirmCancelListing}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.cancelModalYesBtnText}>Cancel Listing</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  },
  // Progress Steps Styles
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressStepActive: {},
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#fff',
  },
  progressDotDone: {
    backgroundColor: '#10b981',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
    marginBottom: 24,
  },
  progressLineDone: {
    backgroundColor: '#10b981',
  },
  progressLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  progressMessage: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
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
  },
  inscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  inscribeButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 12,
    gap: 8,
  },
  inscribeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  list: {
    paddingBottom: 20,
  },
  row: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  ordinalItem: {
    flex: 1,
    maxWidth: '31%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ordinalPreview: {
    aspectRatio: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ordinalImage: {
    width: '100%',
    height: '100%',
  },
  ordinalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ordinalPlaceholderIcon: {
    fontSize: 24,
    color: '#fff',
  },
  ordinalPlaceholderText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#666',
  },
  ordinalInfo: {
    padding: 6,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  ordinalNumber: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#10b981',
  },
  listedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listedBadgeLarge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listedBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  currentPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  // Listed Warning Styles
  listedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,147,26,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 12,
  },
  listedWarningText: {
    flex: 1,
  },
  listedWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f7931a',
    marginBottom: 2,
  },
  listedWarningDesc: {
    fontSize: 12,
    color: '#999',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputTextDisabled: {
    color: '#444',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  // Cancel Modal Styles
  cancelWarningText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 20,
  },
  cancelModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelModalNoBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  cancelModalNoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelModalYesBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalYesBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabledStyle: {
    opacity: 0.6,
  },
  actionTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionTabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  actionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  actionTabTextActive: {
    color: '#000',
  },
  cancelListingTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  cancelListingTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  editPriceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(247,147,26,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(247,147,26,0.3)',
  },
  editPriceTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f7931a',
  },
  currentPriceContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPriceLabel: {
    fontSize: 14,
    color: '#888',
  },
  currentPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f7931a',
  },
  ordinalInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  ordinalThumbnailSmall: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  ordinalInfoText: {
    flex: 1,
  },
  ordinalInfoNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ordinalInfoType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  editPriceNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  inputFull: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  priceHint: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 6,
  },
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feeNoticeText: {
    fontSize: 12,
    color: '#888',
  },
  listButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
    maxHeight: '90%',
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
  selectedOrdinal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  ordinalPreviewLarge: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ordinalImageLarge: {
    width: '100%',
    height: '100%',
  },
  ordinalPlaceholderLarge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordinalPreviewInfo: {
    flex: 1,
  },
  ordinalPreviewNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  ordinalPreviewId: {
    fontSize: 12,
    color: '#888',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,149,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,68,68,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
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
  copyButton: {
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
  transferButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  // Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderWidth: 2,
    borderColor: '#ff9500',
    borderRadius: 16,
  },
  scannerHint: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    padding: 20,
  },
});
