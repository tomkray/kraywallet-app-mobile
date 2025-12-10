/**
 * Market Screen
 * Buy and sell Bitcoin assets (Runes, Ordinals, BRC-20)
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import * as api from '../services/api';
import colors from '../theme/colors';

interface MarketScreenProps {
  onBack: () => void;
}

type TabType = 'browse' | 'my-listings';
type AssetFilter = 'all' | 'rune' | 'ordinal' | 'brc20';

export function MarketScreen({ onBack }: MarketScreenProps) {
  const { wallet } = useWallet();
  
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<api.MarketOffer[]>([]);
  const [myListings, setMyListings] = useState<api.MarketOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listingAsset, setListingAsset] = useState('');
  const [listingType, setListingType] = useState<'rune' | 'ordinal' | 'brc20'>('rune');
  const [listingAmount, setListingAmount] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [listingPriceUnit, setListingPriceUnit] = useState<'BTC' | 'KRAY'>('BTC');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  
  // Buy Modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<api.MarketOffer | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  useEffect(() => {
    loadListings();
  }, [assetFilter]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const filters = assetFilter !== 'all' ? { assetType: assetFilter } : undefined;
      const [allListings, mine] = await Promise.all([
        api.getMarketListings(filters),
        wallet?.address ? api.getMyMarketListings(wallet.address) : Promise.resolve([]),
      ]);
      setListings(allListings);
      setMyListings(mine);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadListings();
    setRefreshing(false);
  };

  const handleCreateListing = async () => {
    if (!wallet?.address) return;
    
    if (!listingAsset || !listingPrice) {
      setCreateError('Please fill in all fields');
      return;
    }
    
    setIsCreating(true);
    setCreateError('');
    setCreateSuccess('');
    
    try {
      await api.createMarketListing({
        sellerAddress: wallet.address,
        asset: listingAsset,
        assetType: listingType,
        amount: listingAmount || undefined,
        price: listingPrice,
        priceUnit: listingPriceUnit,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateSuccess('✅ Listing created successfully!');
      
      // Reset form
      setListingAsset('');
      setListingAmount('');
      setListingPrice('');
      
      // Refresh list
      loadListings();
      
      // Auto close
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess('');
      }, 2000);
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create listing');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBuy = async () => {
    if (!wallet?.address || !selectedListing) return;
    
    setIsBuying(true);
    setBuyError('');
    
    try {
      await api.buyFromMarket({
        listingId: selectedListing.id,
        buyerAddress: wallet.address,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBuyModal(false);
      
      // Refresh list
      loadListings();
    } catch (error: any) {
      setBuyError(error.message || 'Failed to complete purchase');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsBuying(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    try {
      await api.cancelMarketListing(listingId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadListings();
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const openBuyModal = (listing: api.MarketOffer) => {
    setSelectedListing(listing);
    setBuyError('');
    setShowBuyModal(true);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'rune': return '◆';
      case 'ordinal': return '🎨';
      case 'brc20': return '₿';
      default: return '📦';
    }
  };

  const renderListing = ({ item }: { item: api.MarketOffer }) => {
    const isMyListing = item.seller === wallet?.address;
    
    return (
      <View style={styles.listingCard}>
        <View style={styles.listingHeader}>
          <View style={styles.listingIcon}>
            <Text style={styles.listingIconText}>{getAssetIcon(item.assetType)}</Text>
          </View>
          <View style={styles.listingInfo}>
            <Text style={styles.listingAsset}>{item.asset}</Text>
            <Text style={styles.listingType}>{item.assetType.toUpperCase()}</Text>
          </View>
          {item.amount && (
            <View style={styles.listingAmount}>
              <Text style={styles.listingAmountText}>{item.amount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.listingPrice}>
          <Text style={styles.priceLabel}>PRICE</Text>
          <Text style={styles.priceValue}>{item.price} {item.priceUnit}</Text>
        </View>
        
        {isMyListing ? (
          <TouchableOpacity 
            style={styles.cancelListingButton}
            onPress={() => handleCancelListing(item.id)}
          >
            <Ionicons name="trash" size={18} color={colors.error} />
            <Text style={styles.cancelListingText}>Cancel Listing</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.buyButton}
            onPress={() => openBuyModal(item)}
          >
            <Ionicons name="cart" size={18} color="#fff" />
            <Text style={styles.buyButtonText}>Buy Now</Text>
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
          <Text style={styles.headerTitle}>🏪 Market</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['browse', 'my-listings'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'browse' ? 'Browse' : 'My Listings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filters */}
        {activeTab === 'browse' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {(['all', 'rune', 'ordinal', 'brc20'] as AssetFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, assetFilter === filter && styles.filterChipActive]}
                onPress={() => setAssetFilter(filter)}
              >
                <Text style={[styles.filterChipText, assetFilter === filter && styles.filterChipTextActive]}>
                  {filter === 'all' ? 'All' : filter === 'brc20' ? 'BRC-20' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'browse' ? listings : myListings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.row}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textPrimary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏪</Text>
                <Text style={styles.emptyTitle}>No Listings</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'browse' 
                    ? 'No items for sale right now'
                    : 'You have no active listings'}
                </Text>
              </View>
            }
          />
        )}

        {/* Create Listing Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📝 Create Listing</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>List your asset for sale</Text>
              
              {/* Asset Type */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>ASSET TYPE</Text>
                <View style={styles.typeSelector}>
                  {(['rune', 'ordinal', 'brc20'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeOption, listingType === type && styles.typeOptionActive]}
                      onPress={() => setListingType(type)}
                    >
                      <Text style={styles.typeIcon}>{getAssetIcon(type)}</Text>
                      <Text style={[styles.typeText, listingType === type && styles.typeTextActive]}>
                        {type === 'brc20' ? 'BRC-20' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Asset Name/ID */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>
                  {listingType === 'ordinal' ? 'INSCRIPTION ID' : 'TOKEN NAME'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={listingType === 'ordinal' ? 'Enter inscription ID' : 'e.g., DOG•GO•TO•THE•MOON'}
                  placeholderTextColor={colors.textMuted}
                  value={listingAsset}
                  onChangeText={setListingAsset}
                />
              </View>
              
              {/* Amount (for runes/brc20) */}
              {listingType !== 'ordinal' && (
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>AMOUNT</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={listingAmount}
                    onChangeText={setListingAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
              
              {/* Price */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>PRICE</Text>
                <View style={styles.priceInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={listingPrice}
                    onChangeText={setListingPrice}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.priceUnitSelector}>
                    {(['BTC', 'KRAY'] as const).map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[styles.priceUnitOption, listingPriceUnit === unit && styles.priceUnitActive]}
                        onPress={() => setListingPriceUnit(unit)}
                      >
                        <Text style={[styles.priceUnitText, listingPriceUnit === unit && styles.priceUnitTextActive]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                onPress={handleCreateListing}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={colors.buttonPrimaryText} />
                ) : (
                  <>
                    <Ionicons name="pricetag" size={20} color={colors.buttonPrimaryText} />
                    <Text style={styles.primaryButtonText}>List for Sale</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Buy Modal */}
        <Modal
          visible={showBuyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBuyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🛒 Confirm Purchase</Text>
                <TouchableOpacity onPress={() => setShowBuyModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              {selectedListing && (
                <>
                  <View style={styles.buyDetails}>
                    <View style={styles.buyItem}>
                      <View style={styles.buyItemIcon}>
                        <Text style={styles.buyItemIconText}>{getAssetIcon(selectedListing.assetType)}</Text>
                      </View>
                      <View style={styles.buyItemInfo}>
                        <Text style={styles.buyItemName}>{selectedListing.asset}</Text>
                        <Text style={styles.buyItemType}>{selectedListing.assetType.toUpperCase()}</Text>
                        {selectedListing.amount && (
                          <Text style={styles.buyItemAmount}>Amount: {selectedListing.amount}</Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.buyPriceBox}>
                      <Text style={styles.buyPriceLabel}>Total Price</Text>
                      <Text style={styles.buyPriceValue}>
                        {selectedListing.price} {selectedListing.priceUnit}
                      </Text>
                    </View>
                  </View>
                  
                  {buyError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{buyError}</Text>
                    </View>
                  ) : null}
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, isBuying && styles.buttonDisabled]}
                    onPress={handleBuy}
                    disabled={isBuying}
                  >
                    {isBuying ? (
                      <ActivityIndicator color={colors.buttonPrimaryText} />
                    ) : (
                      <>
                        <Ionicons name="card" size={20} color={colors.buttonPrimaryText} />
                        <Text style={styles.primaryButtonText}>Confirm Purchase</Text>
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
  filterContainer: {
    marginTop: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterChipTextActive: {
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
  row: {
    gap: 12,
    marginBottom: 12,
  },
  listingCard: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listingIconText: {
    fontSize: 20,
  },
  listingInfo: {
    flex: 1,
  },
  listingAsset: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  listingType: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  listingAmount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listingAmountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  listingPrice: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  cancelListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  cancelListingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: colors.textPrimary,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeTextActive: {
    color: colors.textPrimary,
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
  priceInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceUnitSelector: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  priceUnitOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceUnitActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  priceUnitText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  priceUnitTextActive: {
    color: colors.textPrimary,
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
  buyDetails: {
    marginBottom: 20,
  },
  buyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyItemIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  buyItemIconText: {
    fontSize: 24,
  },
  buyItemInfo: {
    flex: 1,
  },
  buyItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buyItemType: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  buyItemAmount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  buyPriceBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyPriceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  buyPriceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
  },
});

