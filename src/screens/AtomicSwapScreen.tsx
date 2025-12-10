/**
 * Atomic Swap Screen
 * P2P trustless swaps for Bitcoin assets
 * KRAY OS Style - Black & White
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import * as api from '../services/api';
import colors from '../theme/colors';

interface AtomicSwapScreenProps {
  onBack: () => void;
}

type TabType = 'available' | 'my-offers';

export function AtomicSwapScreen({ onBack }: AtomicSwapScreenProps) {
  const { wallet } = useWallet();
  
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [refreshing, setRefreshing] = useState(false);
  const [availableSwaps, setAvailableSwaps] = useState<api.AtomicSwapOffer[]>([]);
  const [mySwaps, setMySwaps] = useState<api.AtomicSwapOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Offer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [offerAsset, setOfferAsset] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [wantAsset, setWantAsset] = useState('');
  const [wantAmount, setWantAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  
  // Accept Offer Modal
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<api.AtomicSwapOffer | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    loadSwaps();
  }, []);

  const loadSwaps = async () => {
    setIsLoading(true);
    try {
      const [available, mine] = await Promise.all([
        api.getAvailableAtomicSwaps(),
        wallet?.address ? api.getMyAtomicSwaps(wallet.address) : Promise.resolve([]),
      ]);
      setAvailableSwaps(available);
      setMySwaps(mine);
    } catch (error) {
      console.error('Error loading swaps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadSwaps();
    setRefreshing(false);
  };

  const handleCreateOffer = async () => {
    if (!wallet?.address) return;
    
    if (!offerAsset || !offerAmount || !wantAsset || !wantAmount) {
      setCreateError('Please fill in all fields');
      return;
    }
    
    setIsCreating(true);
    setCreateError('');
    setCreateSuccess('');
    
    try {
      const result = await api.createAtomicSwap({
        fromAddress: wallet.address,
        offerAsset,
        offerAmount,
        wantAsset,
        wantAmount,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateSuccess('✅ Swap offer created successfully!');
      
      // Reset form
      setOfferAsset('');
      setOfferAmount('');
      setWantAsset('');
      setWantAmount('');
      
      // Refresh list
      loadSwaps();
      
      // Auto close
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess('');
      }, 2000);
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create offer');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!wallet?.address || !selectedOffer) return;
    
    setIsAccepting(true);
    setAcceptError('');
    
    try {
      await api.acceptAtomicSwap({
        offerId: selectedOffer.id,
        acceptorAddress: wallet.address,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAcceptModal(false);
      
      // Refresh list
      loadSwaps();
    } catch (error: any) {
      setAcceptError(error.message || 'Failed to accept offer');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    try {
      await api.cancelAtomicSwap(offerId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadSwaps();
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const openAcceptModal = (offer: api.AtomicSwapOffer) => {
    setSelectedOffer(offer);
    setAcceptError('');
    setShowAcceptModal(true);
  };

  const renderSwapOffer = ({ item }: { item: api.AtomicSwapOffer }) => {
    const isMyOffer = item.creator === wallet?.address;
    
    return (
      <View style={styles.offerCard}>
        <View style={styles.offerHeader}>
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>
              {item.status === 'open' ? '🟢 Open' : item.status === 'completed' ? '✅ Done' : '⏳ Pending'}
            </Text>
          </View>
          {isMyOffer && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelOffer(item.id)}
            >
              <Ionicons name="close" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.offerDetails}>
          <View style={styles.offerSide}>
            <Text style={styles.offerLabel}>OFFERING</Text>
            <Text style={styles.offerAmount}>{item.offerAmount}</Text>
            <Text style={styles.offerAsset}>{item.offerAsset}</Text>
          </View>
          
          <View style={styles.offerArrow}>
            <Ionicons name="swap-horizontal" size={24} color={colors.textMuted} />
          </View>
          
          <View style={styles.offerSide}>
            <Text style={styles.offerLabel}>WANTS</Text>
            <Text style={styles.offerAmount}>{item.wantAmount}</Text>
            <Text style={styles.offerAsset}>{item.wantAsset}</Text>
          </View>
        </View>
        
        {!isMyOffer && item.status === 'open' && (
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => openAcceptModal(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.acceptButtonText}>Accept Swap</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚛️ Atomic Swap</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['available', 'my-offers'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'available' ? 'Available' : 'My Offers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'available' ? availableSwaps : mySwaps}
            renderItem={renderSwapOffer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textPrimary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔄</Text>
                <Text style={styles.emptyTitle}>No Swaps</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'available' 
                    ? 'No swap offers available right now'
                    : 'You have no active swap offers'}
                </Text>
              </View>
            }
          />
        )}

        {/* Create Offer Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⚛️ Create Swap Offer</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>Create a trustless P2P swap offer</Text>
              
              {/* Offering */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>YOU OFFER</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    value={offerAmount}
                    onChangeText={setOfferAmount}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                    placeholder="Asset"
                    placeholderTextColor={colors.textMuted}
                    value={offerAsset}
                    onChangeText={setOfferAsset}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              
              {/* Arrow */}
              <View style={styles.swapArrowContainer}>
                <Ionicons name="swap-vertical" size={24} color={colors.textMuted} />
              </View>
              
              {/* Wanting */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>YOU WANT</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    value={wantAmount}
                    onChangeText={setWantAmount}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                    placeholder="Asset"
                    placeholderTextColor={colors.textMuted}
                    value={wantAsset}
                    onChangeText={setWantAsset}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              
              {/* Error/Success */}
              {createError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{createError}</Text>
                </View>
              ) : null}
              
              {createSuccess ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.successText}>{createSuccess}</Text>
                </View>
              ) : null}
              
              {/* Create Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isCreating && styles.buttonDisabled]}
                onPress={handleCreateOffer}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={colors.buttonPrimaryText} />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color={colors.buttonPrimaryText} />
                    <Text style={styles.primaryButtonText}>Create Offer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Accept Offer Modal */}
        <Modal
          visible={showAcceptModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAcceptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✅ Accept Swap</Text>
                <TouchableOpacity onPress={() => setShowAcceptModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              {selectedOffer && (
                <>
                  <View style={styles.acceptDetails}>
                    <View style={styles.acceptRow}>
                      <Text style={styles.acceptLabel}>You send</Text>
                      <Text style={styles.acceptValue}>
                        {selectedOffer.wantAmount} {selectedOffer.wantAsset}
                      </Text>
                    </View>
                    <View style={styles.acceptRow}>
                      <Text style={styles.acceptLabel}>You receive</Text>
                      <Text style={styles.acceptValue}>
                        {selectedOffer.offerAmount} {selectedOffer.offerAsset}
                      </Text>
                    </View>
                  </View>
                  
                  {acceptError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{acceptError}</Text>
                    </View>
                  ) : null}
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, isAccepting && styles.buttonDisabled]}
                    onPress={handleAcceptOffer}
                    disabled={isAccepting}
                  >
                    {isAccepting ? (
                      <ActivityIndicator color={colors.buttonPrimaryText} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color={colors.buttonPrimaryText} />
                        <Text style={styles.primaryButtonText}>Confirm Swap</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  createButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  offerCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  offerBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerBadgeText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  cancelButton: {
    padding: 4,
  },
  offerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerSide: {
    flex: 1,
    alignItems: 'center',
  },
  offerLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  offerAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  offerAsset: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  offerArrow: {
    paddingHorizontal: 16,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
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
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Modal styles
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
  inputSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
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
  swapArrowContainer: {
    alignItems: 'center',
    marginVertical: 8,
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.buttonPrimary,
    padding: 16,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.buttonPrimaryText,
  },
  acceptDetails: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acceptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  acceptValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});


