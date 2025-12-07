/**
 * Settings Screen
 * Wallet settings and security options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../context/WalletContext';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsScreen({ onBack, onLogout }: SettingsScreenProps) {
  const { wallet, getMnemonic, deleteWallet, lockWallet } = useWallet();
  
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [recoveryError, setRecoveryError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShowRecovery = async () => {
    setRecoveryError('');
    
    const mnemonic = await getMnemonic(recoveryPassword);
    if (mnemonic) {
      setRecoveryPhrase(mnemonic.split(' '));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setRecoveryError('Incorrect password');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCopyRecovery = async () => {
    await Clipboard.setStringAsync(recoveryPhrase.join(' '));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCloseRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryPassword('');
    setRecoveryPhrase([]);
    setRecoveryError('');
  };

  const handleLock = () => {
    lockWallet();
    onLogout();
  };

  const handleResetWallet = () => {
    Alert.alert(
      '⚠️ Reset Wallet',
      'This will permanently delete your wallet from this device. Make sure you have your recovery phrase backed up!\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await deleteWallet();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onLogout();
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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Wallet Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {wallet?.address ? `${wallet.address.slice(0, 12)}...${wallet.address.slice(-8)}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address Type</Text>
                <Text style={styles.infoValue}>Taproot (P2TR)</Text>
              </View>
            </View>
          </View>

          {/* Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowRecoveryModal(true)}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="key" size={20} color="#f7931a" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Show Recovery Phrase</Text>
                <Text style={styles.menuSubtitle}>View your backup phrase</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLock}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="lock-closed" size={20} color="#3b82f6" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Lock Wallet</Text>
                <Text style={styles.menuSubtitle}>Require password to unlock</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Network */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network</Text>
            
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Network</Text>
                <View style={styles.networkBadge}>
                  <View style={styles.networkDot} />
                  <Text style={styles.networkText}>Mainnet</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>L2 Status</Text>
                <View style={[styles.networkBadge, styles.l2Badge]}>
                  <View style={[styles.networkDot, styles.l2Dot]} />
                  <Text style={[styles.networkText, styles.l2Text]}>Connected</Text>
                </View>
              </View>
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Build</Text>
                <Text style={styles.infoValue}>Mobile Native</Text>
              </View>
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.dangerItem]}
              onPress={handleResetWallet}
            >
              <View style={[styles.menuIconContainer, styles.dangerIconContainer]}>
                <Ionicons name="trash" size={20} color="#ef4444" />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, styles.dangerText]}>Reset Wallet</Text>
                <Text style={styles.menuSubtitle}>Delete wallet from device</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Recovery Phrase Modal */}
        <Modal
          visible={showRecoveryModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Recovery Phrase</Text>
                <TouchableOpacity onPress={handleCloseRecoveryModal}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {recoveryPhrase.length === 0 ? (
                <>
                  {/* Password Input */}
                  <View style={styles.modalBody}>
                    <Text style={styles.modalText}>
                      Enter your password to view your recovery phrase
                    </Text>
                    
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter password"
                      placeholderTextColor="#666"
                      secureTextEntry
                      value={recoveryPassword}
                      onChangeText={setRecoveryPassword}
                      autoCapitalize="none"
                    />

                    {recoveryError ? (
                      <Text style={styles.modalError}>{recoveryError}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleShowRecovery}
                  >
                    <LinearGradient
                      colors={['#f7931a', '#e67e00']}
                      style={styles.modalButtonGradient}
                    >
                      <Text style={styles.modalButtonText}>Show Phrase</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Recovery Phrase Display */}
                  <View style={styles.modalBody}>
                    <View style={styles.warningBanner}>
                      <Ionicons name="warning" size={20} color="#f59e0b" />
                      <Text style={styles.warningText}>
                        Never share your recovery phrase!
                      </Text>
                    </View>

                    <View style={styles.phraseGrid}>
                      {recoveryPhrase.map((word, index) => (
                        <View key={index} style={styles.phraseWord}>
                          <Text style={styles.phraseNumber}>{index + 1}</Text>
                          <Text style={styles.phraseText}>{word}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleCopyRecovery}
                  >
                    <LinearGradient
                      colors={copied ? ['#10b981', '#059669'] : ['#3b82f6', '#2563eb']}
                      style={styles.modalButtonGradient}
                    >
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy'}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.modalButtonText}>
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    maxWidth: '60%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(247,147,26,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,147,26,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f7931a',
    marginRight: 6,
  },
  networkText: {
    fontSize: 12,
    color: '#f7931a',
    fontWeight: '600',
  },
  l2Badge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  l2Dot: {
    backgroundColor: '#10b981',
  },
  l2Text: {
    color: '#10b981',
  },
  dangerTitle: {
    color: '#ef4444',
  },
  dangerItem: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  dangerIconContainer: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  dangerText: {
    color: '#ef4444',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  modalError: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 8,
  },
  phraseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  phraseWord: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  phraseNumber: {
    fontSize: 10,
    color: '#666',
    width: 18,
  },
  phraseText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});

