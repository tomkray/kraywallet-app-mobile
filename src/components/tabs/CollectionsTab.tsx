/**
 * Collections Tab Component
 * Displays user's inscriptions with Buy Now and Market Offer actions
 * Integrated with kray.space marketplace
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as api from '../../services/api';

interface CollectionsTabProps {
  address?: string;
  onListForSale?: (item: api.CollectionItem) => void;
}

type FilterType = 'all' | 'listed' | 'unlisted';

export function CollectionsTab({ address, onListForSale }: CollectionsTabProps) {
  const [collections, setCollections] = useState<api.CollectionItem[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<api.CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Listing Modal State
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<api.CollectionItem | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<'sats' | 'btc'>('sats');
  const [isListing, setIsListing] = useState(false);
  const [listingError, setListingError] = useState('');

  const loadCollections = useCallback(async () => {
    if (!address) return;
    
    try {
      const items = await api.getCollections(address);
      setCollections(items);
      applyFilter(items, filter);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, filter]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const applyFilter = (items: api.CollectionItem[], filterType: FilterType) => {
    switch (filterType) {
      case 'listed':
        setFilteredCollections(items.filter(i => i.isListed));
        break;
      case 'unlisted':
        setFilteredCollections(items.filter(i => !i.isListed));
        break;
      default:
        setFilteredCollections(items);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    applyFilter(collections, newFilter);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadCollections();
    setRefreshing(false);
  };

  const openListingModal = (item: api.CollectionItem) => {
    if (item.isListed) {
      Alert.alert(
        'Already Listed',
        `This inscription is already listed for ${item.listingPrice?.toLocaleString()} sats`,
        [
          { text: 'OK' },
          { 
            text: 'Cancel Listing', 
            style: 'destructive',
            onPress: () => handleCancelListing(item)
          }
        ]
      );
      return;
    }
    
    setSelectedItem(item);
    setListingPrice('');
    setListingError('');
    setShowListingModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCancelListing = async (item: api.CollectionItem) => {
    if (!item.listingOrderId || !address) return;
    
    try {
      await api.cancelBuyNowListing({
        orderId: item.listingOrderId,
        sellerAddress: address,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadCollections();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel listing');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCreateListing = async () => {
    if (!selectedItem || !address) return;
    
    const priceInSats = priceUnit === 'btc' 
      ? Math.floor(parseFloat(listingPrice) * 100000000)
      : parseInt(listingPrice);
    
    if (isNaN(priceInSats) || priceInSats < 546) {
      setListingError('Price must be at least 546 sats');
      return;
    }
    
    setIsListing(true);
    setListingError('');
    
    try {
      // Call parent handler which will handle PSBT signing
      if (onListForSale) {
        onListForSale({
          ...selectedItem,
          listingPrice: priceInSats,
        });
        setShowListingModal(false);
      } else {
        // Direct API call for basic flow (without PSBT signing)
        const result = await api.createBuyNowListing({
          inscription_id: selectedItem.inscriptionId,
          price_sats: priceInSats,
          seller_address: address,
        });
        
        if (result.success) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowListingModal(false);
          loadCollections();
        } else {
          setListingError(result.error || 'Failed to create listing');
        }
      }
    } catch (error: any) {
      setListingError(error.message || 'Failed to create listing');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsListing(false);
    }
  };

  const formatPrice = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(4)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  const renderItem = ({ item }: { item: api.CollectionItem }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => openListingModal(item)}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {item.isListed && (
          <View style={styles.listedBadge}>
            <Text style={styles.listedBadgeText}>LISTED</Text>
          </View>
        )}
      </View>
      
      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemNumber} numberOfLines={1}>
          {item.inscriptionNumber ? `#${item.inscriptionNumber.toLocaleString()}` : '◉'}
        </Text>
        <Text style={styles.itemType} numberOfLines={1}>
          {item.contentType.split('/')[0]}
        </Text>
        
        {item.isListed && item.listingPrice && (
          <Text style={styles.itemPrice}>
            {formatPrice(item.listingPrice)}
          </Text>
        )}
      </View>
      
      {/* Action Button */}
      <View style={styles.actionContainer}>
        {item.isListed ? (
          <View style={styles.listedIcon}>
            <Ionicons name="pricetag" size={16} color="#10b981" />
          </View>
        ) : (
          <View style={styles.sellIcon}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7931a" />
        <Text style={styles.loadingText}>Loading collections...</Text>
      </View>
    );
  }

  if (collections.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>◉</Text>
        <Text style={styles.emptyTitle}>No Inscriptions</Text>
        <Text style={styles.emptyText}>
          Your inscriptions will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {(['all', 'unlisted', 'listed'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => handleFilterChange(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? `All (${collections.length})` : 
               f === 'listed' ? `Listed (${collections.filter(i => i.isListed).length})` :
               `Unlisted (${collections.filter(i => !i.isListed).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={filteredCollections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#f7931a"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>
              No {filter} inscriptions
            </Text>
          </View>
        }
      />

      {/* Listing Modal */}
      <Modal
        visible={showListingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowListingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List for Sale</Text>
              <TouchableOpacity onPress={() => setShowListingModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {selectedItem && (
              <>
                {/* Preview */}
                <View style={styles.previewContainer}>
                  <Image 
                    source={{ uri: selectedItem.thumbnail }} 
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewNumber}>
                      {selectedItem.inscriptionNumber 
                        ? `Inscription #${selectedItem.inscriptionNumber.toLocaleString()}`
                        : 'Inscription'}
                    </Text>
                    <Text style={styles.previewType}>{selectedItem.contentType}</Text>
                  </View>
                </View>
                
                {/* Price Input */}
                <View style={styles.priceSection}>
                  <Text style={styles.priceLabel}>PRICE</Text>
                  <View style={styles.priceInputRow}>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor="#666"
                      value={listingPrice}
                      onChangeText={setListingPrice}
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.unitSelector}>
                      <TouchableOpacity
                        style={[styles.unitOption, priceUnit === 'sats' && styles.unitActive]}
                        onPress={() => setPriceUnit('sats')}
                      >
                        <Text style={[styles.unitText, priceUnit === 'sats' && styles.unitTextActive]}>
                          SATS
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitOption, priceUnit === 'btc' && styles.unitActive]}
                        onPress={() => setPriceUnit('btc')}
                      >
                        <Text style={[styles.unitText, priceUnit === 'btc' && styles.unitTextActive]}>
                          BTC
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Fee Info */}
                <View style={styles.feeInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#888" />
                  <Text style={styles.feeText}>2% marketplace fee applies</Text>
                </View>
                
                {/* Error */}
                {listingError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                    <Text style={styles.errorText}>{listingError}</Text>
                  </View>
                ) : null}
                
                {/* List Button */}
                <TouchableOpacity
                  style={[styles.listButton, isListing && styles.buttonDisabled]}
                  onPress={handleCreateListing}
                  disabled={isListing}
                >
                  {isListing ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="pricetag" size={20} color="#000" />
                      <Text style={styles.listButtonText}>List for Sale</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#fff',
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: '#f7931a',
    borderColor: '#f7931a',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  filterTextActive: {
    color: '#000',
  },
  grid: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  itemCard: {
    flex: 1,
    maxWidth: '32%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  thumbnailContainer: {
    aspectRatio: 1,
    backgroundColor: '#111',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
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
  listedBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  itemInfo: {
    padding: 8,
  },
  itemNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemType: {
    fontSize: 9,
    color: '#666',
  },
  itemPrice: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  listedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f7931a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFilter: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: 14,
    color: '#666',
  },
  // Modal Styles
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
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  previewInfo: {
    flex: 1,
  },
  previewNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  previewType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  priceInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  unitActive: {
    backgroundColor: 'rgba(247,147,26,0.2)',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  unitTextActive: {
    color: '#f7931a',
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  feeText: {
    fontSize: 12,
    color: '#888',
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
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f7931a',
    padding: 16,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  listButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});


