/**
 * Market Screen
 * Buy and sell Bitcoin assets (Runes, Ordinals)
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
  Linking,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import * as api from '../services/api';
import colors from '../theme/colors';

interface MarketScreenProps {
  onBack: () => void;
}

type TabType = 'browse' | 'collections' | 'my-listings' | 'runes-market';
type AssetFilter = 'all' | 'ordinal' | 'rune';

// Known Collections - Same as ordinals.html
interface Collection {
  id: string;
  name: string;
  description: string;
  parentId: string;
  items: number;
  featured?: boolean;
  category: string;
  verified?: boolean;
  rune?: string;
  coverUrl?: string;
}

const KNOWN_COLLECTIONS: Collection[] = [
  {
    id: 'runespace-guardians',
    name: 'RUNESPACE',
    description: '26 unique guardians inscribed forever on Bitcoin, protecting the Origin Layer with honor.',
    parentId: '9f24c4c5b58ba82fe38e15181b00f0bb090046f85a4c6ebecb0bafeb91c355dfi0',
    items: 26,
    featured: true,
    category: 'PFP',
    verified: true
  },
  {
    id: 'dog-social-club',
    name: 'DOG•SOCIAL•CLUB',
    description: 'Join the world\'s largest dog community. 306 unique dogs inscribed on Bitcoin.',
    parentId: '8a18494da6e0d1902243220c397cdecf4de9d64020cf0fa9fa16adfc6e29e4eci0',
    items: 306,
    featured: false,
    category: 'PFP',
    verified: true,
    rune: 'DOG•SOCIAL•CLUB'
  },
  {
    id: 'runestone',
    name: 'RUNESTONE',
    description: 'The legendary Runestone collection with over 112,000 inscriptions.',
    parentId: 'fdb2df5d2b16db1ebcbf09e2d23b3f4e417db44b58e712c99b61f26b52c7cbb5i0',
    items: 112384,
    featured: false,
    category: 'Collectible',
    verified: true
  },
];

export function MarketScreen({ onBack }: MarketScreenProps) {
  const { wallet, signPsbt } = useWallet();
  const { width, height } = useWindowDimensions();
  const isVertical = height > width; // Detect vertical/portrait mode
  
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<api.BuyNowListing[]>([]);
  const [myListings, setMyListings] = useState<api.BuyNowListing[]>([]);
  
  // Runes Market listings (from /api/runes-atomic-swap)
  const [runesListings, setRunesListings] = useState<api.RunesListing[]>([]);
  const [myRunesListings, setMyRunesListings] = useState<api.RunesListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Collections state
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionItems, setCollectionItems] = useState<any[]>([]);
  const [allCollectionItems, setAllCollectionItems] = useState<any[]>([]); // All items loaded
  const [displayedItemsCount, setDisplayedItemsCount] = useState(21); // Items shown
  const [loadingCollectionItems, setLoadingCollectionItems] = useState(false);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  const [collectionListings, setCollectionListings] = useState<Map<string, number>>(new Map()); // inscription_id -> price
  
  // Create Listing Modal (use ListingModal instead)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listingAsset, setListingAsset] = useState('');
  const [listingType, setListingType] = useState<'rune' | 'ordinal'>('ordinal');
  const [listingAmount, setListingAmount] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [listingPriceUnit, setListingPriceUnit] = useState<'BTC' | 'KRAY'>('BTC');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  
  // Buy Modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<api.BuyNowListing | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [buyPassword, setBuyPassword] = useState('');
  const [buyStep, setBuyStep] = useState<'confirm' | 'password' | 'signing'>('confirm');
  const [buyError, setBuyError] = useState('');
  const [buyFeeRate, setBuyFeeRate] = useState<number>(5); // sat/vB
  const [customFeeRate, setCustomFeeRate] = useState<string>('');
  const [useCustomFee, setUseCustomFee] = useState(false);
  const [mempoolFees, setMempoolFees] = useState<{ fast: number; medium: number; slow: number } | null>(null);
  
  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxid, setSuccessTxid] = useState<string>('');
  
  // Edit Price Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingListing, setEditingListing] = useState<api.BuyNowListing | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editStep, setEditStep] = useState<'input' | 'cancelling' | 'creating' | 'signing' | 'confirming' | 'success' | 'error'>('input');
  
  // Cancel Modal (Ordinals)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingListing, setCancellingListing] = useState<api.BuyNowListing | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [editMessage, setEditMessage] = useState('');
  
  // Cancel Modal (Runes)
  const [showCancelRunesModal, setShowCancelRunesModal] = useState(false);
  const [cancellingRunesListing, setCancellingRunesListing] = useState<api.RunesListing | null>(null);
  const [isCancellingRunes, setIsCancellingRunes] = useState(false);
  const [cancelRunesError, setCancelRunesError] = useState('');
  
  // 🪙 Runes Market - Buy Modal
  const [showBuyRunesModal, setShowBuyRunesModal] = useState(false);
  const [selectedRunesListing, setSelectedRunesListing] = useState<api.RunesListing | null>(null);
  const [isBuyingRunes, setIsBuyingRunes] = useState(false);
  const [buyRunesPassword, setBuyRunesPassword] = useState('');
  const [buyRunesStep, setBuyRunesStep] = useState<'confirm' | 'password' | 'signing'>('confirm');
  const [buyRunesError, setBuyRunesError] = useState('');
  const [buyRunesFeeRate, setBuyRunesFeeRate] = useState<number>(5);

  useEffect(() => {
    loadListings();
  }, [assetFilter]);

  // Fetch real fee rates from mempool.space when buy modal opens
  useEffect(() => {
    if (showBuyModal) {
      fetchMempoolFees();
    }
  }, [showBuyModal]);

  // Fetch real fee rates from mempool.space when buy RUNES modal opens
  useEffect(() => {
    if (showBuyRunesModal) {
      fetchMempoolFees();
    }
  }, [showBuyRunesModal]);

  const fetchMempoolFees = async () => {
    try {
      const res = await fetch('https://mempool.space/api/v1/fees/recommended');
      if (res.ok) {
        const data = await res.json();
        setMempoolFees({
          fast: data.fastestFee,
          medium: data.halfHourFee,
          slow: data.hourFee,
        });
        // Set default to medium fee
        if (!useCustomFee) {
          setBuyFeeRate(data.halfHourFee);
        }
        console.log('📊 Mempool fees:', data);
      }
    } catch (error) {
      console.warn('Could not fetch mempool fees:', error);
    }
  };

  const loadListings = async () => {
    setIsLoading(true);
    try {
      console.log('🏪 Loading market listings...');
      console.log('   Wallet address:', wallet?.address);
      
      // Load Ordinals/Inscriptions listings
      const allListings = await api.getBuyNowListings();
      console.log('   Ordinals listings:', allListings.length);
      
      // Filter by status = OPEN
      const openListings = allListings.filter(l => l.status === 'OPEN');
      console.log('   Open ordinals listings:', openListings.length);
      
      // Filter my listings - backend uses seller_payout_address
      const mine = wallet?.address 
        ? openListings.filter(l => {
            const sellerAddr = l.seller_address || l.seller_payout_address;
            const match = sellerAddr === wallet.address;
            return match;
          })
        : [];
      console.log('   My ordinals listings:', mine.length);
      
      setListings(openListings);
      setMyListings(mine);
      
      // 🪙 Load Runes Market listings
      console.log('🪙 Loading Runes Market listings...');
      const allRunesListings = await api.getRunesListings();
      console.log('   Runes listings:', allRunesListings.length);
      
      // Filter by status = OPEN
      const openRunesListings = allRunesListings.filter(l => l.status === 'OPEN');
      console.log('   Open runes listings:', openRunesListings.length);
      
      // Filter my runes listings
      const myRunes = wallet?.address 
        ? openRunesListings.filter(l => l.seller_payout_address === wallet.address)
        : [];
      console.log('   My runes listings:', myRunes.length);
      
      setRunesListings(openRunesListings);
      setMyRunesListings(myRunes);
      
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
    if (!wallet?.address || !selectedListing || !buyPassword) return;
    
    // Verify wallet has UTXOs
    if (!wallet.utxos || wallet.utxos.length === 0) {
      setBuyError('No UTXOs available. Please fund your wallet first.');
      return;
    }
    
    setIsBuying(true);
    setBuyStep('signing');
    setBuyError('');
    
    try {
      // 🛡️ FILTER PURE UTXOs - Only use UTXOs without inscriptions or runes
      // This protects user's inscriptions and runes from being accidentally spent
      const pureUtxos = wallet.utxos.filter((utxo: any) => 
        !utxo.hasInscription && !utxo.hasRunes
      );
      
      console.log('🛡️ UTXO Filter:');
      console.log('   Total UTXOs:', wallet.utxos.length);
      console.log('   Pure BTC UTXOs:', pureUtxos.length);
      console.log('   Protected (inscr/runes):', wallet.utxos.length - pureUtxos.length);
      
      if (pureUtxos.length === 0) {
        throw new Error('No pure BTC UTXOs available. All your UTXOs contain Inscriptions or Runes.');
      }
      
      // Format pure UTXOs for the backend
      const buyerUtxos = pureUtxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        scriptPubKey: utxo.scriptPubKey || utxo.script_pubkey || utxo.script,
      }));
      
      console.log('📦 Initiating purchase...');
      console.log('   Buyer UTXOs:', buyerUtxos.length);
      console.log('   Total value:', buyerUtxos.reduce((sum: number, u: any) => sum + u.value, 0), 'sats');
      
      // Step 1: Get PSBT to sign as buyer (now with UTXOs)
      const purchaseRes = await api.buyNowPurchase({
        orderId: selectedListing.order_id,
        buyerAddress: wallet.address,
        buyerUtxos: buyerUtxos,
        feeRate: buyFeeRate,
      });
      
      if (!purchaseRes.success || !purchaseRes.psbt_base64) {
        throw new Error(purchaseRes.error || 'Failed to create purchase PSBT');
      }
      
      console.log('📋 PSBT received, required:', purchaseRes.required_sats, 'sats');
      
      // Get which inputs the buyer needs to sign (Input[1+], NOT Input[0] which is seller's)
      // Backend returns inputsToSign array, e.g., [1] for single buyer UTXO
      const buyerInputs = purchaseRes.inputsToSign || [1]; // Default to [1] if not provided
      console.log('📝 Buyer inputs to sign:', buyerInputs);
      
      // Step 2: Sign PSBT as buyer (SIGHASH_ALL = 0x01) - ONLY buyer's inputs
      console.log('🔏 Signing purchase PSBT...');
      const signedPsbt = await signPsbt(purchaseRes.psbt_base64, buyPassword, 0x01, buyerInputs);
      
      // Step 3: Confirm purchase (backend injects seller signature and broadcasts)
      console.log('✅ Confirming purchase...');
      const confirmRes = await api.confirmBuyNowPurchase({
        orderId: selectedListing.order_id,
        buyerSignedPsbt: signedPsbt,
      });
      
      if (!confirmRes.success) {
        throw new Error(confirmRes.error || 'Failed to confirm purchase');
      }
      
      console.log('🎉 Purchase complete! TXID:', confirmRes.txid);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBuyModal(false);
      setBuyPassword('');
      setBuyStep('confirm');
      
      // Show success modal with TXID
      setSuccessTxid(confirmRes.txid || '');
      setShowSuccessModal(true);
      
      // Refresh list
      loadListings();
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      setBuyError(error.message || 'Failed to complete purchase');
      setBuyStep('confirm');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsBuying(false);
    }
  };

  const handleCancelListing = (listing: api.BuyNowListing) => {
    if (!wallet?.address) return;
    setCancellingListing(listing);
    setCancelError('');
    setShowCancelModal(true);
  };
  
  const confirmCancelListing = async () => {
    if (!wallet?.address || !cancellingListing) return;
    
    setIsCancelling(true);
    setCancelError('');
    
    try {
      const result = await api.cancelBuyNowListing({
        orderId: cancellingListing.order_id,
        sellerAddress: wallet.address,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel listing');
      }
      
      if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setShowCancelModal(false);
      setCancellingListing(null);
      loadListings();
    } catch (error: any) {
      setCancelError(error.message || 'Failed to cancel listing');
    } finally {
      setIsCancelling(false);
    }
  };

  // Open Edit Price Modal
  const openEditModal = (listing: api.BuyNowListing) => {
    setEditingListing(listing);
    setNewPrice(listing.price_sats.toString());
    setEditPassword('');
    setEditStep('input');
    setEditMessage('');
    setShowEditModal(true);
  };

  // Confirm Edit Price - Cancel old and create new listing
  const confirmEditPrice = async () => {
    if (!editingListing || !wallet?.address || !newPrice || !editPassword) {
      setEditMessage('Please fill all fields');
      return;
    }

    const priceSats = parseInt(newPrice);
    if (isNaN(priceSats) || priceSats < 546) {
      setEditMessage('Price must be at least 546 sats');
      return;
    }

    setIsEditing(true);
    setEditMessage('');

    try {
      // STEP 1: Cancel existing listing
      setEditStep('cancelling');
      setEditMessage('Cancelling old listing...');
      
      await api.cancelBuyNowListing({
        orderId: editingListing.order_id,
        sellerAddress: wallet.address,
      });
      
      // STEP 2: Create new listing with new price
      setEditStep('creating');
      setEditMessage('Creating new listing...');
      
      const response = await api.createBuyNowListing({
        inscription_id: editingListing.inscription_id,
        price_sats: priceSats,
        seller_address: wallet.address,
      });

      if (!response.success || !response.psbt_base64 || !response.order_id) {
        throw new Error(response.error || 'Failed to create listing');
      }

      // STEP 3: Sign PSBT with SIGHASH_NONE|ANYONECANPAY (0x82)
      setEditStep('signing');
      setEditMessage('Signing transaction...');
      
      const signedPsbt = await signPsbt(response.psbt_base64, editPassword, 0x82);
      
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT');
      }
      
      // STEP 4: Confirm listing with signed PSBT
      setEditStep('confirming');
      setEditMessage('Confirming listing...');
      
      const confirmResponse = await api.confirmBuyNowListing({
        order_id: response.order_id,
        signed_psbt: signedPsbt,
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || 'Failed to confirm listing');
      }

      setEditStep('success');
      setEditMessage(`Price updated to ${priceSats.toLocaleString()} sats!`);
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Refresh listings
      loadListings();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowEditModal(false);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Edit price error:', error);
      setEditStep('error');
      setEditMessage(error.message || 'Failed to update price');
    } finally {
      setIsEditing(false);
    }
  };

  // Open inscription in KrayScan
  const viewInKrayScan = (inscriptionId: string) => {
    const url = `https://kray.space/krayscan.html?inscription=${inscriptionId}`;
    Linking.openURL(url);
  };

  // Open collection and load its items (same logic as ordinals.html)
  const openCollection = async (collection: Collection) => {
    setSelectedCollection(collection);
    setLoadingCollectionItems(true);
    setCollectionItems([]);
    setAllCollectionItems([]);
    setDisplayedItemsCount(21);
    setCollectionListings(new Map());
    
    try {
      let items: any[] = [];
      
      // Use our backend proxy to fetch ALL children
      const response = await fetch(`https://kray.space/api/explorer/children/${collection.parentId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.children) {
          console.log(`🏛️ Found ${data.children.length} items in collection ${collection.name}`);
          items = data.children.map((item: any) => ({
            ...item,
            is3D: collection.id === 'runestone',
          }));
        }
      }
      
      // Fallback if no items
      if (items.length === 0) {
        try {
          const ordResponse = await fetch(`https://ordinals.com/children/${collection.parentId}`);
          if (ordResponse.ok) {
            const html = await ordResponse.text();
            const inscriptionPattern = /\/inscription\/([a-f0-9]{64}i\d+)/g;
            const matches = [...html.matchAll(inscriptionPattern)];
            const uniqueIds = [...new Set(matches.map(m => m[1]))];
            const childrenIds = uniqueIds.filter(id => id !== collection.parentId);
            
            items = childrenIds.map((id, index) => ({
              id: id,
              inscription_id: id,
              number: index + 1,
              is3D: collection.id === 'runestone',
            }));
          }
        } catch (e) {
          console.log('Direct fetch failed');
        }
      }
      
      // Fetch marketplace listings to show listed items first
      try {
        const listingsResponse = await fetch(`https://kray.space/api/atomic-swap/buy-now/listings`);
        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          const listingsMap = new Map<string, number>();
          
          // Build map of inscription_id -> price
          (listingsData.listings || []).forEach((listing: any) => {
            if (listing.status === 'OPEN') {
              listingsMap.set(listing.inscription_id, listing.price_sats);
            }
          });
          
          setCollectionListings(listingsMap);
          
          // Sort items: listed first (by price low to high), then unlisted
          items.sort((a, b) => {
            const priceA = listingsMap.get(a.id || a.inscription_id);
            const priceB = listingsMap.get(b.id || b.inscription_id);
            
            // Both listed - sort by price
            if (priceA !== undefined && priceB !== undefined) {
              return priceA - priceB;
            }
            // Only A is listed - A comes first
            if (priceA !== undefined) return -1;
            // Only B is listed - B comes first
            if (priceB !== undefined) return 1;
            // Neither listed - keep original order
            return 0;
          });
          
          console.log(`🏷️ Found ${listingsMap.size} listed items in collection`);
        }
      } catch (e) {
        console.log('Could not fetch listings');
      }
      
      // Store all items and show first 21
      setAllCollectionItems(items);
      setCollectionItems(items.slice(0, 21));
      
    } catch (error) {
      console.error('Error loading collection items:', error);
    } finally {
      setLoadingCollectionItems(false);
    }
  };
  
  // Load more items
  const loadMoreCollectionItems = () => {
    if (loadingMoreItems) return;
    setLoadingMoreItems(true);
    
    const newCount = displayedItemsCount + 21;
    setDisplayedItemsCount(newCount);
    setCollectionItems(allCollectionItems.slice(0, newCount));
    
    setLoadingMoreItems(false);
  };

  const closeCollection = () => {
    setSelectedCollection(null);
    setCollectionItems([]);
  };

  const openBuyModal = (listing: api.BuyNowListing) => {
    setSelectedListing(listing);
    setBuyError('');
    setBuyPassword('');
    setBuyStep('confirm');
    setShowBuyModal(true);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'rune': return '⧈';
      case 'ordinal': return '◉';
      default: return '📦';
    }
  };

  const formatSats = (sats: number) => {
    if (sats >= 100000000) return `${(sats / 100000000).toFixed(4)} BTC`;
    return `${sats.toLocaleString()} sats`;
  };

  // Filter listings by asset type
  const getFilteredListings = (listingsToFilter: api.BuyNowListing[]) => {
    // When filter is 'rune', we don't return ordinals listings
    // Runes are handled separately in getFilteredRunesListings
    if (assetFilter === 'rune') return [];
    if (assetFilter === 'all') return listingsToFilter;
    
    return listingsToFilter.filter(listing => {
      // Inscriptions/Ordinals have inscription_id
      const isOrdinal = !!listing.inscription_id;
      if (assetFilter === 'ordinal') return isOrdinal;
      return true;
    });
  };
  
  // Get runes listings (when filter is 'rune' or 'all')
  const getFilteredRunesListings = (isMyListings: boolean = false) => {
    if (assetFilter === 'ordinal') return [];
    return isMyListings ? myRunesListings : runesListings;
  };

  const renderListing = ({ item }: { item: api.BuyNowListing }) => {
    const sellerAddr = item.seller_address || item.seller_payout_address;
    const isMyListing = sellerAddr === wallet?.address;
    // Use ordinals.com or ord.io for thumbnail - they work better
    const thumbnailUrl = `https://ordinals.com/content/${item.inscription_id}`;
    const fallbackUrl = `https://ord.io/content/${item.inscription_id}`;
    
    return (
      <TouchableOpacity 
        style={styles.listingCard}
        onPress={() => viewInKrayScan(item.inscription_id)}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        <View style={styles.listingThumbnail}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            resizeMode="cover"
            defaultSource={{ uri: fallbackUrl }}
          />
          </View>
        
        {/* Number & Price */}
          <View style={styles.listingInfo}>
          <Text style={styles.listingNumber} numberOfLines={1}>
            #{item.inscription_number || item.inscription_id.slice(-6)}
          </Text>
          <Text style={styles.listingPriceText}>{formatSats(item.price_sats)}</Text>
        </View>
        
        {/* Action Buttons */}
        {isMyListing ? (
          <View style={styles.myListingActions}>
            <TouchableOpacity 
              style={styles.editListingButton}
              onPress={(e) => {
                e.stopPropagation();
                openEditModal(item);
              }}
            >
              <Ionicons name="pencil" size={12} color="#f7931a" />
            </TouchableOpacity>
            
          <TouchableOpacity 
            style={styles.cancelListingButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelListing(item);
              }}
          >
              <Ionicons name="trash" size={12} color={colors.error} />
          </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.buyButton}
            onPress={(e) => {
              e.stopPropagation();
              openBuyModal(item);
            }}
          >
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // 🪙 Render Runes Listing Card
  const renderRunesListing = ({ item }: { item: api.RunesListing }) => {
    const isMyListing = item.seller_payout_address === wallet?.address;
    const displayAmount = Number(item.sell_amount) / Math.pow(10, item.divisibility || 0);
    const pricePerToken = (item.price_sats / displayAmount).toFixed(2);
    
    // Use parent thumbnail if available, otherwise fallback to symbol
    const hasThumbnail = !!item.thumbnail;
    
    return (
      <TouchableOpacity 
        style={styles.listingCard}
        onPress={() => openBuyRunesModal(item)}
        activeOpacity={0.8}
      >
        {/* Rune Thumbnail or Symbol */}
        <View style={[styles.listingThumbnail, !hasThumbnail && { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
          {hasThumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 32 }}>{item.rune_symbol || '⧈'}</Text>
          )}
          <View style={styles.runeBadge}>
            <Text style={styles.runeBadgeText}>RUNE</Text>
          </View>
        </View>
        
        {/* Name & Price */}
        <View style={styles.listingInfo}>
          <Text style={styles.listingNumber} numberOfLines={1}>
            {item.rune_name || item.rune_id}
          </Text>
          <Text style={styles.runeAmountText}>{displayAmount.toLocaleString()} tokens</Text>
          <Text style={styles.listingPriceText}>{formatSats(item.price_sats)}</Text>
          <Text style={styles.runePricePerToken}>{pricePerToken} sat/token</Text>
        </View>
        
        {/* Action Buttons */}
        {isMyListing ? (
          <View style={styles.myListingActions}>
            <TouchableOpacity 
              style={styles.cancelListingButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelRunesListing(item);
              }}
            >
              <Ionicons name="trash" size={12} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.buyButton, { backgroundColor: '#ff6b35' }]}
            onPress={(e) => {
              e.stopPropagation();
              openBuyRunesModal(item);
            }}
          >
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  
  // Open Runes Buy Modal
  const openBuyRunesModal = (listing: api.RunesListing) => {
    setSelectedRunesListing(listing);
    setShowBuyRunesModal(true);
    setBuyRunesStep('confirm');
    setBuyRunesError('');
    setBuyRunesPassword('');
    if (mempoolFees) {
      setBuyRunesFeeRate(mempoolFees.medium);
    }
  };
  
  // Handle Runes Purchase
  const handleBuyRunes = async () => {
    if (!wallet?.address || !selectedRunesListing || !buyRunesPassword) return;
    
    if (!wallet.utxos || wallet.utxos.length === 0) {
      setBuyRunesError('No UTXOs available. Please fund your wallet first.');
      return;
    }
    
    setIsBuyingRunes(true);
    setBuyRunesStep('signing');
    setBuyRunesError('');
    
    try {
      // 🛡️ FILTER PURE UTXOs
      const pureUtxos = wallet.utxos.filter((utxo: any) => 
        !utxo.hasInscription && !utxo.hasRunes
      );
      
      console.log('🪙 RUNES PURCHASE:');
      console.log('   Pure UTXOs:', pureUtxos.length);
      
      if (pureUtxos.length === 0) {
        throw new Error('No pure BTC UTXOs available. All your UTXOs contain Inscriptions or Runes.');
      }
      
      const buyerUtxos = pureUtxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        scriptPubKey: utxo.scriptPubKey || utxo.script_pubkey || utxo.script,
      }));
      
      // Step 1: Prepare purchase PSBT
      console.log('📦 Preparing Runes purchase PSBT...');
      const prepareRes = await api.buyRunesPrepare({
        orderId: selectedRunesListing.order_id,
        buyerAddress: wallet.address,
        buyerUtxos: buyerUtxos,
        feeRate: buyRunesFeeRate,
      });
      
      if (!prepareRes.success || !prepareRes.psbt_base64) {
        throw new Error(prepareRes.error || 'Failed to prepare purchase PSBT');
      }
      
      console.log('📋 PSBT received, inputs to sign:', prepareRes.inputs_to_sign);
      
      // Step 2: Sign PSBT (buyer signs their inputs with SIGHASH_ALL = 0x01)
      console.log('🔏 Signing purchase PSBT...');
      const signedPsbt = await signPsbt(
        prepareRes.psbt_base64, 
        buyRunesPassword, 
        0x01 // SIGHASH_ALL for buyer (same as ordinals)
      );
      
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT');
      }
      
      console.log('✅ PSBT signed, broadcasting...');
      
      // Step 3: Broadcast
      const broadcastRes = await api.buyRunesBroadcast({
        orderId: selectedRunesListing.order_id,
        signedPsbt: signedPsbt,
        buyerAddress: wallet.address,
      });
      
      if (!broadcastRes.success) {
        throw new Error(broadcastRes.error || 'Failed to broadcast');
      }
      
      console.log('✅ Runes purchase complete:', broadcastRes.txid);
      
      // Success!
      setShowBuyRunesModal(false);
      setSuccessTxid(broadcastRes.txid || '');
      setShowSuccessModal(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Refresh listings
      await loadListings();
      
    } catch (error: any) {
      console.error('❌ Runes purchase failed:', error);
      setBuyRunesError(error.message || 'Purchase failed');
      setBuyRunesStep('confirm');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsBuyingRunes(false);
    }
  };
  
  // Cancel Runes Listing - Open modal
  const handleCancelRunesListing = (listing: api.RunesListing) => {
    if (!wallet?.address) return;
    setCancellingRunesListing(listing);
    setCancelRunesError('');
    setShowCancelRunesModal(true);
  };
  
  // Confirm Cancel Runes Listing
  const confirmCancelRunesListing = async () => {
    if (!cancellingRunesListing || !wallet?.address) return;
    
    setIsCancellingRunes(true);
    setCancelRunesError('');
    
    try {
      console.log('🗑️ Cancelling Runes listing:', cancellingRunesListing.order_id);
      
      const result = await api.cancelRunesListing({
        orderId: cancellingRunesListing.order_id,
        sellerAddress: wallet.address,
      });
      
      if (result.success) {
        console.log('✅ Runes listing cancelled successfully');
        setShowCancelRunesModal(false);
        setCancellingRunesListing(null);
        await loadListings();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setCancelRunesError(result.error || 'Failed to cancel listing');
      }
    } catch (error: any) {
      console.error('❌ Cancel Runes error:', error);
      setCancelRunesError(error.message || 'Failed to cancel listing');
    } finally {
      setIsCancellingRunes(false);
    }
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
          {(['browse', 'collections', 'my-listings'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'browse' ? 'Browse' : tab === 'collections' ? 'Collections' : 'My Listings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filters */}
        {activeTab === 'browse' && (
          <View style={[styles.filterContainer, isVertical && styles.filterContainerVertical]}>
            {(['all', 'ordinal', 'rune'] as AssetFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isVertical && styles.filterTabVertical]}
                onPress={() => setAssetFilter(filter)}
              >
                <Text style={[styles.filterTabText, assetFilter === filter && styles.filterTabTextActive]}>
                  {filter === 'all' ? 'All' : filter === 'ordinal' ? '◉ Ordinals' : '⧈ Runes'}
                </Text>
                {assetFilter === filter && <View style={styles.filterTabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : activeTab === 'collections' ? (
          /* Collections Tab */
          <ScrollView 
            style={styles.collectionsContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textPrimary}
              />
            }
          >
            {/* Featured Collection */}
            {KNOWN_COLLECTIONS.filter(c => c.featured).map(collection => (
              <TouchableOpacity
                key={collection.id}
                style={styles.featuredCollection}
                onPress={() => openCollection(collection)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: `https://ordinals.com/content/${collection.parentId}` }}
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View style={styles.featuredOverlay}>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>FEATURED</Text>
                  </View>
                  <Text style={styles.featuredName}>{collection.name}</Text>
                  <Text style={styles.featuredDesc} numberOfLines={2}>{collection.description}</Text>
                  <Text style={styles.featuredItems}>{collection.items.toLocaleString()} items</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* All Collections Grid */}
            <Text style={styles.collectionsTitle}>All Collections</Text>
            <View style={styles.collectionsGrid}>
              {KNOWN_COLLECTIONS.map(collection => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionCard}
                  onPress={() => openCollection(collection)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: `https://ordinals.com/content/${collection.parentId}` }}
                    style={styles.collectionImage}
                    resizeMode="cover"
                  />
                  <View style={styles.collectionInfo}>
                    <View style={styles.collectionHeader}>
                      <Text style={styles.collectionName} numberOfLines={1}>{collection.name}</Text>
                      {collection.verified && (
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      )}
                    </View>
                    <Text style={styles.collectionItems}>{collection.items.toLocaleString()} items</Text>
                    <Text style={styles.collectionCategory}>{collection.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : assetFilter === 'rune' ? (
          /* 🪙 RUNES MARKET - Only Runes */
          <FlatList
            data={getFilteredRunesListings(activeTab === 'my-listings')}
            renderItem={renderRunesListing}
            keyExtractor={(item) => item.order_id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            numColumns={3}
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
                <Text style={styles.emptyIcon}>🪙</Text>
                <Text style={styles.emptyTitle}>No Runes Listings</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'browse' 
                    ? 'No runes for sale right now'
                    : 'You have no rune listings'}
                </Text>
              </View>
            }
          />
        ) : (
          /* Ordinals + All (when filter is 'all' or 'ordinal') */
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textPrimary}
              />
            }
          >
            {/* Ordinals Listings */}
            {getFilteredListings(activeTab === 'browse' ? listings : myListings).length > 0 && (
              <>
                {assetFilter === 'all' && (
                  <Text style={[styles.runesSectionTitle, { color: '#10b981' }]}>◉ Ordinals ({getFilteredListings(activeTab === 'browse' ? listings : myListings).length})</Text>
                )}
                <View style={[styles.row, { paddingHorizontal: 12, justifyContent: 'flex-start' }]}>
                  {getFilteredListings(activeTab === 'browse' ? listings : myListings).map(item => (
                    <View key={item.order_id}>
                      {renderListing({ item })}
                    </View>
                  ))}
                </View>
              </>
            )}
            
            {/* 🪙 Runes Listings (only when filter is 'all') */}
            {assetFilter === 'all' && getFilteredRunesListings(activeTab === 'my-listings').length > 0 && (
              <>
                <Text style={styles.runesSectionTitle}>⧈ Runes ({getFilteredRunesListings(activeTab === 'my-listings').length})</Text>
                <View style={[styles.row, { paddingHorizontal: 12, justifyContent: 'flex-start' }]}>
                  {getFilteredRunesListings(activeTab === 'my-listings').map(item => (
                    <View key={item.order_id}>
                      {renderRunesListing({ item })}
                    </View>
                  ))}
                </View>
              </>
            )}
            
            {/* Empty State */}
            {getFilteredListings(activeTab === 'browse' ? listings : myListings).length === 0 && 
             (assetFilter !== 'all' || getFilteredRunesListings(activeTab === 'my-listings').length === 0) && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏪</Text>
                <Text style={styles.emptyTitle}>No Listings</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'browse' 
                    ? 'No items for sale right now'
                    : 'You have no active listings'}
                </Text>
              </View>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
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
                  {(['ordinal', 'rune'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeOption, listingType === type && styles.typeOptionActive]}
                      onPress={() => setListingType(type)}
                    >
                      <Text style={styles.typeIcon}>{getAssetIcon(type)}</Text>
                      <Text style={[styles.typeText, listingType === type && styles.typeTextActive]}>
                        {type === 'rune' ? '⧈ Rune' : '◉ Ordinal'}
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
              
              {/* Amount (only for runes) */}
              {listingType === 'rune' && (
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
                <Text style={styles.modalTitle}>
                  {buyStep === 'signing' ? '🔏 Signing...' : '🛒 Confirm Purchase'}
                </Text>
                <TouchableOpacity onPress={() => setShowBuyModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              {buyStep === 'signing' ? (
                <View style={styles.signingContainer}>
                  <ActivityIndicator size="large" color="#f7931a" />
                  <Text style={styles.signingText}>Processing purchase...</Text>
                  <Text style={styles.signingSubtext}>Please wait</Text>
                </View>
              ) : selectedListing && (
                <>
                  <View style={styles.buyDetails}>
                    <View style={styles.buyItem}>
                      <Image
                        source={{ uri: `https://ordinals.com/content/${selectedListing.inscription_id}` }}
                        style={styles.buyItemThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.buyItemInfo}>
                        <Text style={styles.buyItemName} numberOfLines={1}>
                          #{selectedListing.inscription_number?.toLocaleString() || selectedListing.inscription_id.slice(0, 12) + '...'}
                        </Text>
                        <Text style={styles.buyItemType}>INSCRIPTION</Text>
                      </View>
                    </View>
                    
                    {/* Price Breakdown */}
                    <View style={styles.buyPriceBox}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Price</Text>
                        <Text style={styles.priceRowValue}>{formatSats(selectedListing.price_sats)}</Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Market Fee (2%)</Text>
                        <Text style={styles.priceRowValue}>
                          {formatSats(Math.max(546, Math.floor(selectedListing.price_sats * 0.02)))}
                        </Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Network Fee (~400 vB)</Text>
                        <Text style={styles.priceRowValue}>~{formatSats(400 * buyFeeRate)}</Text>
                      </View>
                      <View style={[styles.priceRow, styles.priceRowTotal]}>
                        <Text style={styles.priceRowLabelTotal}>Total</Text>
                      <Text style={styles.buyPriceValue}>
                          ~{formatSats(
                            selectedListing.price_sats + 
                            Math.max(546, Math.floor(selectedListing.price_sats * 0.02)) + 
                            (400 * buyFeeRate)
                          )}
                      </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Fee Rate Selector */}
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>NETWORK FEE RATE</Text>
                    <View style={styles.feeSelector}>
                      {[
                        { label: 'Slow', rate: mempoolFees?.slow || 2, time: '~1h' },
                        { label: 'Normal', rate: mempoolFees?.medium || 5, time: '~30m' },
                        { label: 'Fast', rate: mempoolFees?.fast || 10, time: '~10m' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.feeOption,
                            !useCustomFee && buyFeeRate === option.rate && styles.feeOptionActive
                          ]}
                          onPress={() => {
                            setBuyFeeRate(option.rate);
                            setUseCustomFee(false);
                            setCustomFeeRate('');
                          }}
                        >
                          <Text style={[
                            styles.feeOptionLabel,
                            !useCustomFee && buyFeeRate === option.rate && styles.feeOptionLabelActive
                          ]}>{option.label}</Text>
                          <Text style={[
                            styles.feeOptionRate,
                            !useCustomFee && buyFeeRate === option.rate && styles.feeOptionRateActive
                          ]}>{option.rate} sat/vB</Text>
                          <Text style={styles.feeOptionTime}>{option.time}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {/* Custom Fee Input */}
                    <View style={styles.customFeeContainer}>
                      <TouchableOpacity
                        style={[styles.customFeeToggle, useCustomFee && styles.customFeeToggleActive]}
                        onPress={() => setUseCustomFee(!useCustomFee)}
                      >
                        <Ionicons 
                          name={useCustomFee ? "checkbox" : "square-outline"} 
                          size={18} 
                          color={useCustomFee ? colors.success : colors.textMuted} 
                        />
                        <Text style={[styles.customFeeLabel, useCustomFee && styles.customFeeLabelActive]}>
                          Custom
                        </Text>
                      </TouchableOpacity>
                      {useCustomFee && (
                        <View style={styles.customFeeInputContainer}>
                          <TextInput
                            style={styles.customFeeInput}
                            placeholder="sat/vB"
                            placeholderTextColor={colors.textMuted}
                            value={customFeeRate}
                            onChangeText={(text) => {
                              setCustomFeeRate(text);
                              const num = parseInt(text);
                              if (!isNaN(num) && num > 0) {
                                setBuyFeeRate(num);
                              }
                            }}
                            keyboardType="number-pad"
                          />
                          <Text style={styles.customFeeUnit}>sat/vB</Text>
                        </View>
                      )}
                    </View>
                    
                    {mempoolFees && (
                      <Text style={styles.feesSource}>
                        📊 Live from mempool.space
                      </Text>
                    )}
                  </View>
                  
                  {/* Password Input */}
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>WALLET PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter password to sign"
                      placeholderTextColor={colors.textMuted}
                      value={buyPassword}
                      onChangeText={setBuyPassword}
                      secureTextEntry
                    />
                  </View>
                  
                  {buyError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{buyError}</Text>
                    </View>
                  ) : null}
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, (isBuying || !buyPassword) && styles.buttonDisabled]}
                    onPress={handleBuy}
                    disabled={isBuying || !buyPassword}
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

        {/* ⧈ Buy Runes Modal */}
        <Modal
          visible={showBuyRunesModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBuyRunesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {buyRunesStep === 'signing' ? '🔏 Signing...' : '⧈ Buy Runes'}
                </Text>
                <TouchableOpacity onPress={() => setShowBuyRunesModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              {buyRunesStep === 'signing' ? (
                <View style={styles.signingContainer}>
                  <ActivityIndicator size="large" color="#ff6b35" />
                  <Text style={styles.signingText}>Processing purchase...</Text>
                  <Text style={styles.signingSubtext}>Please wait</Text>
                </View>
              ) : selectedRunesListing && (
                <>
                  <View style={styles.buyDetails}>
                    {/* Rune Info with Parent Thumbnail */}
                    <View style={[styles.buyItem, { alignItems: 'center' }]}>
                      <View style={[styles.buyItemThumbnail, !selectedRunesListing.thumbnail && { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                        {selectedRunesListing.thumbnail ? (
                          <Image
                            source={{ uri: selectedRunesListing.thumbnail }}
                            style={{ width: '100%', height: '100%', borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={{ fontSize: 32 }}>{selectedRunesListing.rune_symbol || '⧈'}</Text>
                        )}
                      </View>
                      <View style={styles.buyItemInfo}>
                        <Text style={styles.buyItemName} numberOfLines={1}>
                          {selectedRunesListing.rune_name || selectedRunesListing.rune_id}
                        </Text>
                        <Text style={styles.buyItemType}>RUNE</Text>
                        <Text style={[styles.buyItemType, { color: '#ff6b35' }]}>
                          {(Number(selectedRunesListing.sell_amount) / Math.pow(10, selectedRunesListing.divisibility || 0)).toLocaleString()} tokens
                        </Text>
                      </View>
                    </View>
                    
                    {/* Price Breakdown */}
                    <View style={styles.buyPriceBox}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Price</Text>
                        <Text style={styles.priceRowValue}>{formatSats(selectedRunesListing.price_sats)}</Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Price per token</Text>
                        <Text style={[styles.priceRowValue, { color: '#ff6b35' }]}>
                          {(selectedRunesListing.price_sats / (Number(selectedRunesListing.sell_amount) / Math.pow(10, selectedRunesListing.divisibility || 0))).toFixed(4)} sat
                        </Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Market Fee (2%)</Text>
                        <Text style={styles.priceRowValue}>
                          {formatSats(Math.max(546, Math.floor(selectedRunesListing.price_sats * 0.02)))}
                        </Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>Network Fee</Text>
                        <Text style={styles.priceRowValue}>~{formatSats(500 * buyRunesFeeRate)}</Text>
                      </View>
                      <View style={[styles.priceRow, styles.priceRowTotal]}>
                        <Text style={styles.priceRowLabelTotal}>Total</Text>
                        <Text style={styles.buyPriceValue}>
                          ~{formatSats(
                            selectedRunesListing.price_sats + 
                            Math.max(546, Math.floor(selectedRunesListing.price_sats * 0.02)) + 
                            (500 * buyRunesFeeRate)
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Fee Rate */}
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>NETWORK FEE RATE</Text>
                    <View style={styles.feeSelector}>
                      {[
                        { label: 'Slow', rate: mempoolFees?.slow || 2 },
                        { label: 'Normal', rate: mempoolFees?.medium || 5 },
                        { label: 'Fast', rate: mempoolFees?.fast || 10 },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.feeOption,
                            buyRunesFeeRate === option.rate && styles.feeOptionActive
                          ]}
                          onPress={() => setBuyRunesFeeRate(option.rate)}
                        >
                          <Text style={[
                            styles.feeOptionLabel,
                            buyRunesFeeRate === option.rate && styles.feeOptionLabelActive
                          ]}>{option.label}</Text>
                          <Text style={[
                            styles.feeOptionRate,
                            buyRunesFeeRate === option.rate && styles.feeOptionRateActive
                          ]}>{option.rate} sat/vB</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {mempoolFees && (
                      <Text style={styles.feesSource}>
                        📊 Live from mempool.space
                      </Text>
                    )}
                  </View>
                  
                  {/* Password */}
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>WALLET PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter password to sign"
                      placeholderTextColor={colors.textMuted}
                      value={buyRunesPassword}
                      onChangeText={setBuyRunesPassword}
                      secureTextEntry
                    />
                  </View>
                  
                  {buyRunesError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{buyRunesError}</Text>
                    </View>
                  ) : null}
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#ff6b35' }, (isBuyingRunes || !buyRunesPassword) && styles.buttonDisabled]}
                    onPress={handleBuyRunes}
                    disabled={isBuyingRunes || !buyRunesPassword}
                  >
                    {isBuyingRunes ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Ionicons name="card" size={20} color="#000" />
                        <Text style={[styles.primaryButtonText, { color: '#000' }]}>Buy Runes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Purchase Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                <Text style={styles.successTitle}>Purchase Complete! 🎉</Text>
                <Text style={styles.successSubtext}>
                  Your inscription has been successfully purchased.
                </Text>
                
                {successTxid && (
                  <View style={{ marginTop: 20, width: '100%' }}>
                    <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 8 }]}>
                      TRANSACTION ID
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`https://mempool.space/tx/${successTxid}`)}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', fontFamily: 'monospace' }}>
                        {successTxid.slice(0, 20)}...{successTxid.slice(-20)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => Linking.openURL(`https://mempool.space/tx/${successTxid}`)}
                  >
                    <Text style={styles.secondaryButtonText}>Mempool</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => Linking.openURL(`https://kray.space/krayscan.html?txid=${successTxid}`)}
                  >
                    <Text style={styles.secondaryButtonText}>KrayScan</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 12, width: '100%' }]}
                  onPress={() => setShowSuccessModal(false)}
                >
                  <Ionicons name="checkmark" size={20} color={colors.buttonPrimaryText} />
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Price Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => !isEditing && setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Price</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>

              {editStep === 'success' ? (
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={60} color={colors.success} />
                  <Text style={styles.successTitle}>Price Updated!</Text>
                  <Text style={styles.successSubtext}>{editMessage}</Text>
                </View>
              ) : editStep !== 'input' ? (
                <View style={styles.progressContainer}>
                  <ActivityIndicator size="large" color="#f7931a" />
                  <Text style={styles.progressText}>{editMessage}</Text>
                  <View style={styles.progressSteps}>
                    <View style={[styles.progressStep, editStep !== 'input' && styles.progressStepActive]}>
                      <Text style={styles.progressStepText}>1. Cancel</Text>
                    </View>
                    <View style={[styles.progressStep, ['creating', 'signing', 'confirming'].includes(editStep) && styles.progressStepActive]}>
                      <Text style={styles.progressStepText}>2. Create</Text>
                    </View>
                    <View style={[styles.progressStep, ['signing', 'confirming'].includes(editStep) && styles.progressStepActive]}>
                      <Text style={styles.progressStepText}>3. Sign</Text>
                    </View>
                    <View style={[styles.progressStep, editStep === 'confirming' && styles.progressStepActive]}>
                      <Text style={styles.progressStepText}>4. Confirm</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  {/* Listing Info */}
                  {editingListing && (
                    <View style={styles.editListingInfo}>
                      <Image
                        source={{ uri: `https://ordinals.com/content/${editingListing.inscription_id}` }}
                        style={styles.editThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.editListingDetails}>
                        <Text style={styles.editListingId}>#{editingListing.inscription_id.slice(-8)}</Text>
                        <Text style={styles.editCurrentPrice}>
                          Current: {editingListing.price_sats.toLocaleString()} sats
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* New Price Input */}
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>NEW PRICE (SATS)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new price"
                      placeholderTextColor={colors.textMuted}
                      value={newPrice}
                      onChangeText={setNewPrice}
                      keyboardType="number-pad"
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>WALLET PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter password to sign"
                      placeholderTextColor={colors.textMuted}
                      value={editPassword}
                      onChangeText={setEditPassword}
                      secureTextEntry
                    />
                  </View>

                  {/* Error Message */}
                  {editMessage && editStep === 'error' && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{editMessage}</Text>
                    </View>
                  )}

                  {/* Confirm Button */}
                  <TouchableOpacity
                    style={[styles.primaryButton, (!newPrice || !editPassword) && styles.buttonDisabled]}
                    onPress={confirmEditPrice}
                    disabled={!newPrice || !editPassword || isEditing}
                  >
                    <Ionicons name="checkmark" size={20} color={colors.buttonPrimaryText} />
                    <Text style={styles.primaryButtonText}>Update Price</Text>
                  </TouchableOpacity>

                  <Text style={styles.editNote}>
                    This will cancel the current listing and create a new one with the updated price.
                  </Text>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Cancel Listing Modal (Ordinals) */}
        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          onRequestClose={() => !isCancelling && setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: 350 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cancel Listing</Text>
                {!isCancelling && (
                  <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>

              {cancellingListing && (
                <View style={styles.editListingInfo}>
                  <Image
                    source={{ uri: `https://ordinals.com/content/${cancellingListing.inscription_id}` }}
                    style={styles.editThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.editListingDetails}>
                    <Text style={styles.editListingId}>
                      #{cancellingListing.inscription_number?.toLocaleString() || cancellingListing.inscription_id.slice(-8)}
                    </Text>
                    <Text style={styles.editCurrentPrice}>
                      Price: {cancellingListing.price_sats.toLocaleString()} sats
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.cancelWarning}>
                Are you sure you want to cancel this listing? The inscription will be removed from the marketplace.
              </Text>

              {cancelError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{cancelError}</Text>
                </View>
              ) : null}

              <View style={styles.cancelModalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalNoButton}
                  onPress={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                >
                  <Text style={styles.cancelModalNoText}>Keep Listed</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.cancelModalYesButton, isCancelling && styles.buttonDisabled]}
                  onPress={confirmCancelListing}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.cancelModalYesText}>Cancel Listing</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Cancel Runes Listing Modal */}
        <Modal
          visible={showCancelRunesModal}
          transparent
          animationType="fade"
          onRequestClose={() => !isCancellingRunes && setShowCancelRunesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: 400 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⧈ Cancel Rune Listing</Text>
                {!isCancellingRunes && (
                  <TouchableOpacity onPress={() => setShowCancelRunesModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>

              {cancellingRunesListing && (
                <View style={styles.editListingInfo}>
                  <View style={[styles.editThumbnail, !cancellingRunesListing.thumbnail && { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                    {cancellingRunesListing.thumbnail ? (
                      <Image
                        source={{ uri: cancellingRunesListing.thumbnail }}
                        style={{ width: '100%', height: '100%', borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 32 }}>{cancellingRunesListing.rune_symbol || '⧈'}</Text>
                    )}
                  </View>
                  <View style={styles.editListingDetails}>
                    <Text style={styles.editListingId} numberOfLines={1}>
                      {cancellingRunesListing.rune_name}
                    </Text>
                    <Text style={[styles.editCurrentPrice, { color: '#ff6b35' }]}>
                      {(Number(cancellingRunesListing.sell_amount) / Math.pow(10, cancellingRunesListing.divisibility || 0)).toLocaleString()} tokens
                    </Text>
                    <Text style={styles.editCurrentPrice}>
                      Price: {cancellingRunesListing.price_sats.toLocaleString()} sats
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.cancelWarning}>
                Are you sure you want to cancel this listing? The runes will be removed from the marketplace.
              </Text>

              {cancelRunesError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{cancelRunesError}</Text>
                </View>
              ) : null}

              <View style={styles.cancelModalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalNoButton}
                  onPress={() => setShowCancelRunesModal(false)}
                  disabled={isCancellingRunes}
                >
                  <Text style={styles.cancelModalNoText}>Keep Listed</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.cancelModalYesButton, isCancellingRunes && styles.buttonDisabled]}
                  onPress={confirmCancelRunesListing}
                  disabled={isCancellingRunes}
                >
                  {isCancellingRunes ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.cancelModalYesText}>Cancel Listing</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Collection Detail Modal */}
        <Modal
          visible={!!selectedCollection}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeCollection}
        >
          <View style={styles.collectionModalContainer}>
            <SafeAreaView style={styles.collectionModalSafe}>
              {/* Header */}
              <View style={styles.collectionModalHeader}>
                <TouchableOpacity onPress={closeCollection} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.collectionModalTitle} numberOfLines={1}>
                  {selectedCollection?.name}
                </Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Collection Banner */}
              {selectedCollection && (
                <View style={styles.collectionBanner}>
                  <Image
                    source={{ uri: `https://ordinals.com/content/${selectedCollection.parentId}` }}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bannerOverlay}>
                    <Text style={styles.bannerName}>{selectedCollection.name}</Text>
                    <Text style={styles.bannerDesc} numberOfLines={3}>{selectedCollection.description}</Text>
                    <View style={styles.bannerStats}>
                      <View style={styles.bannerStat}>
                        <Text style={styles.bannerStatValue}>{selectedCollection.items.toLocaleString()}</Text>
                        <Text style={styles.bannerStatLabel}>Items</Text>
                      </View>
                      <View style={styles.bannerStat}>
                        <Text style={styles.bannerStatValue}>{selectedCollection.category}</Text>
                        <Text style={styles.bannerStatLabel}>Category</Text>
                      </View>
                      {selectedCollection.verified && (
                        <View style={styles.bannerStat}>
                          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                          <Text style={styles.bannerStatLabel}>Verified</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Collection Items */}
              <Text style={styles.collectionItemsTitle}>Items</Text>
              
              {loadingCollectionItems ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.textPrimary} />
                  <Text style={styles.loadingText}>Loading items...</Text>
                </View>
              ) : (
                <FlatList
                  data={collectionItems}
                  keyExtractor={(item, index) => item.id || item.inscription_id || `item-${index}`}
                  numColumns={3}
                  columnWrapperStyle={styles.row}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const contentUrl = `https://ordinals.com/content/${item.id || item.inscription_id}`;
                    const is3D = item.is3D || selectedCollection?.id === 'runestone';
                    const itemId = item.id || item.inscription_id;
                    const listingPrice = collectionListings.get(itemId);
                    const isListed = listingPrice !== undefined;
                    
                    return (
                      <TouchableOpacity
                        style={[styles.collectionItemCard, isListed && styles.collectionItemListed]}
                        onPress={() => viewInKrayScan(itemId)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.collectionItemImageContainer}>
                          {is3D ? (
                            // 3D content - show placeholder with 3D badge
                            <View style={styles.collectionItem3DContainer}>
                              <Text style={styles.collectionItem3DIcon}>🎮</Text>
                              <View style={styles.badge3D}>
                                <Text style={styles.badge3DText}>3D</Text>
                              </View>
                            </View>
                          ) : (
                            // Regular image content
                            <Image
                              source={{ uri: contentUrl }}
                              style={styles.collectionItemImage}
                              resizeMode="cover"
                            />
                          )}
                          {/* Listed badge */}
                          {isListed && (
                            <View style={styles.listedBadge}>
                              <Text style={styles.listedBadgeText}>🏷️</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.collectionItemInfo}>
                          <Text style={styles.collectionItemNumber} numberOfLines={1}>
                            #{item.number || item.index || '?'}
                          </Text>
                          {isListed && (
                            <Text style={styles.collectionItemPrice}>
                              {listingPrice >= 100000000 
                                ? `${(listingPrice / 100000000).toFixed(4)} BTC`
                                : `${listingPrice.toLocaleString()} sats`}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>📦</Text>
                      <Text style={styles.emptyTitle}>No Items Found</Text>
                      <Text style={styles.emptyText}>Could not load collection items</Text>
                    </View>
                  }
                  ListFooterComponent={
                    collectionItems.length < allCollectionItems.length ? (
                      <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={loadMoreCollectionItems}
                        disabled={loadingMoreItems}
                      >
                        {loadingMoreItems ? (
                          <ActivityIndicator size="small" color={colors.textPrimary} />
                        ) : (
                          <>
                            <Text style={styles.viewMoreText}>
                              View More ({allCollectionItems.length - collectionItems.length} remaining)
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
                          </>
                        )}
                      </TouchableOpacity>
                    ) : allCollectionItems.length > 0 ? (
                      <Text style={styles.allLoadedText}>
                        All {allCollectionItems.length} items loaded
                      </Text>
                    ) : null
                  }
                />
              )}
            </SafeAreaView>
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
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  filterContainerVertical: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
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
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.buttonPrimaryText,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  filterTabVertical: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  listingCard: {
    width: 110,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 10,
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
    marginTop: 8,
    marginBottom: 8,
  },
  listingNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  listingPriceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 4,
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
  listingStatus: {
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(247,147,26,0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  signingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  signingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  signingSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  buyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.buttonPrimaryText,
  },
  myListingActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  editListingButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,147,26,0.15)',
    padding: 6,
    borderRadius: 6,
  },
  editListingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f7931a',
  },
  cancelListingButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    padding: 6,
    borderRadius: 6,
  },
  cancelListingText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.error,
  },
  listingThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
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
  buyItemThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceRowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceRowValue: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  priceRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  priceRowLabelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  feeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  feeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  feeOptionActive: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  feeOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  feeOptionLabelActive: {
    color: colors.success,
  },
  feeOptionRate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  feeOptionRateActive: {
    color: colors.success,
  },
  customFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  customFeeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customFeeToggleActive: {},
  customFeeLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  customFeeLabelActive: {
    color: colors.success,
  },
  customFeeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  customFeeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  customFeeUnit: {
    fontSize: 12,
    color: colors.textMuted,
  },
  feesSource: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  feeOptionTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Edit Modal Styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
  },
  successSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
  },
  progressStep: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressStepActive: {
    backgroundColor: 'rgba(247,147,26,0.2)',
  },
  progressStepText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  editListingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  editListingDetails: {
    flex: 1,
  },
  editListingId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editCurrentPrice: {
    fontSize: 13,
    color: '#f7931a',
    marginTop: 4,
  },
  editNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  // Cancel Modal Styles
  cancelWarning: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 20,
  },
  cancelModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelModalNoButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelModalNoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelModalYesButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalYesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
  },
  // Collections Styles
  collectionsContainer: {
    flex: 1,
    padding: 16,
  },
  featuredCollection: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  featuredBadge: {
    backgroundColor: '#f7931a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  featuredName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  featuredDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  featuredItems: {
    fontSize: 12,
    color: '#f7931a',
    fontWeight: '600',
  },
  collectionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  collectionCard: {
    width: '47%',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  collectionImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  collectionInfo: {
    padding: 12,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  collectionItems: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  collectionCategory: {
    fontSize: 10,
    color: '#f7931a',
    fontWeight: '600',
  },
  // Collection Modal
  collectionModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  collectionModalSafe: {
    flex: 1,
  },
  collectionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collectionModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  collectionBanner: {
    height: 180,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  bannerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  bannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    lineHeight: 18,
  },
  bannerStats: {
    flexDirection: 'row',
    gap: 24,
  },
  bannerStat: {
    alignItems: 'center',
  },
  bannerStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bannerStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  collectionItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  collectionItemCard: {
    flex: 1,
    maxWidth: '31%',
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  collectionItemImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  collectionItemImage: {
    width: '100%',
    height: '100%',
  },
  collectionItem3DContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'linear-gradient(135deg, #0a0a15 0%, #1a1025 100%)',
  },
  collectionItem3DIcon: {
    fontSize: 32,
    opacity: 0.6,
  },
  badge3D: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badge3DText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  collectionItemInfo: {
    padding: 6,
  },
  collectionItemNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  collectionItemListed: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  listedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listedBadgeText: {
    fontSize: 10,
  },
  collectionItemPrice: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
    marginTop: 2,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  allLoadedText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
  },
  // 🪙 Runes Market Styles
  runeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff6b35',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  runeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  runeAmountText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  runePricePerToken: {
    fontSize: 8,
    color: '#ff6b35',
    marginTop: 1,
  },
  runesListContainer: {
    marginTop: 8,
  },
  runesSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff6b35',
    marginLeft: 12,
    marginBottom: 12,
    marginTop: 20,
  },
});



