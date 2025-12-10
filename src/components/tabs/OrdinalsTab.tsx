/**
 * Ordinals Tab Component
 * Display user's inscriptions with Transfer functionality
 * KRAY OS Style - Same as extension production
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

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
}

export function OrdinalsTab({ ordinals, walletAddress, onTransfer }: OrdinalsTabProps) {
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedOrdinal, setSelectedOrdinal] = useState<Ordinal | null>(null);
  const [transferTo, setTransferTo] = useState('');
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

  if (ordinals.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🎨</Text>
        <Text style={styles.emptyTitle}>No Inscriptions</Text>
        <Text style={styles.emptyText}>
          Your Ordinals inscriptions will appear here
        </Text>
      </View>
    );
  }

  // Open Transfer Modal
  const handleOrdinalPress = (ordinal: Ordinal) => {
    setSelectedOrdinal(ordinal);
    setTransferTo('');
    setPassword('');
    setTransferError('');
    setSuccessTxid(null);
    setCopiedTxid(false);
    setShowTransferModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle Transfer
  const handleTransfer = async () => {
    if (!selectedOrdinal || !transferTo || !password) {
      setTransferError('Please fill all fields');
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
  };

  // QR Scanner
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    let address = data;
    if (data.toLowerCase().startsWith('bitcoin:')) {
      address = data.replace(/^bitcoin:/i, '').split('?')[0];
    }
    setTransferTo(address);
    setShowScanner(false);
    setScanned(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

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

  const getContentTypeIcon = (contentType: string) => {
    if (contentType?.startsWith('image/')) return '🖼️';
    if (contentType?.startsWith('text/')) return '📝';
    if (contentType?.startsWith('video/')) return '🎬';
    if (contentType?.startsWith('audio/')) return '🎵';
    if (contentType?.includes('html')) return '🌐';
    return '📄';
  };

  const renderOrdinal = ({ item }: { item: Ordinal }) => {
    // Use thumbnail (which is /content/) or fallback to preview/content
    const imageUrl = item.thumbnail || item.preview || item.content;
    const hasImage = !!imageUrl;

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
        </View>
        <View style={styles.ordinalInfo}>
          <Text style={styles.ordinalNumber}>#{item.number?.toLocaleString() || '?'}</Text>
          <View style={styles.sendBadge}>
            <Ionicons name="arrow-up" size={10} color="#fff" />
            <Text style={styles.sendBadgeText}>Send</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={ordinals}
        renderItem={renderOrdinal}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Inscription</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedOrdinal && (
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
                </View>
                <View style={styles.ordinalPreviewInfo}>
                  <Text style={styles.ordinalPreviewNumber}>
                    Inscription #{selectedOrdinal.number?.toLocaleString() || '?'}
                  </Text>
                  <Text style={styles.ordinalPreviewId} numberOfLines={1}>
                    {selectedOrdinal.id}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recipient Address</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={styles.input}
                  placeholder="bc1p... or tb1..."
                  placeholderTextColor="#666"
                  value={transferTo}
                  onChangeText={setTransferTo}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
                  <Ionicons name="qr-code" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
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
                <Text style={styles.successTitle}>Transaction Broadcast!</Text>
                <Text style={styles.successSubtitle}>Your inscription is being transferred</Text>
                
                <Text style={styles.txidLabel}>TRANSACTION ID</Text>
                <View style={styles.txidBox}>
                  <Text style={styles.txidText}>{successTxid.slice(0, 20)}...{successTxid.slice(-8)}</Text>
                  <TouchableOpacity onPress={copyTxid} style={styles.copyButton}>
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
                  onPress={() => Linking.openURL(`https://krayscan.com/tx/${successTxid}`)}
                >
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <Text style={styles.explorerText}>View on KrayScan</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.transferButton, isTransferring && styles.transferButtonDisabled]}
              onPress={successTxid ? handleDone : handleTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <ActivityIndicator color="#fff" />
              ) : successTxid ? (
                <Text style={styles.transferButtonText}>✓ Done</Text>
              ) : (
                <>
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                  <Text style={styles.transferButtonText}>Send Inscription</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <View style={{ width: 28 }} />
          </View>
          
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
            </View>
          </View>
          
          <Text style={styles.scannerHint}>
            Point your camera at a Bitcoin address QR code
          </Text>
        </SafeAreaView>
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
  list: {
    paddingBottom: 20,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  ordinalItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
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
  },
  ordinalPlaceholderText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#666',
  },
  ordinalInfo: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ordinalNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  sendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,149,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sendBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ff9500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
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
    backgroundColor: '#ff9500',
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
    color: '#fff',
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
