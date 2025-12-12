/**
 * Activity Tab Component
 * Transaction history with pending support and dynamic Runes/Ordinals enrichment
 * Each rune transaction fetches its UNIQUE thumbnail via tx-enrich API
 * 
 * OPTIMIZED: Only enriches visible transactions (5 at a time) to avoid overloading
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';

const PAGE_SIZE = 5; // Load 5 transactions at a time
const API_URL = 'https://kraywallet-backend.onrender.com';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vin: any[];
  vout: any[];
  fee: number;
}

// Enrichment data from API
interface TxEnrichment {
  type: 'rune' | 'ordinal' | 'btc';
  // Rune fields
  runeId?: string;
  runeName?: string;
  runeSymbol?: string;
  runeAmount?: string;
  // Ordinal fields
  inscriptionId?: string;
  inscriptionNumber?: number;
  // Shared
  thumbnail?: string; // UNIQUE thumbnail for each asset!
  contentUrl?: string;
}

interface ActivityTabProps {
  transactions: Transaction[];
  address?: string;
  runes?: Array<{
    name: string;
    symbol: string;
    thumbnail?: string;
  }>;
}

export function ActivityTab({ transactions, address, runes }: ActivityTabProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [enrichments, setEnrichments] = useState<Map<string, TxEnrichment>>(new Map());
  const [loadingEnrichments, setLoadingEnrichments] = useState(false);
  const [enrichedTxIds, setEnrichedTxIds] = useState<Set<string>>(new Set());

  // Enrich a batch of transactions
  const enrichBatch = useCallback(async (txsToEnrich: Transaction[]) => {
    if (txsToEnrich.length === 0) return;
    
    setLoadingEnrichments(true);
    
    const newEnrichments = new Map(enrichments);
    const newEnrichedIds = new Set(enrichedTxIds);
    
    await Promise.all(txsToEnrich.map(async (tx) => {
      // Skip if already enriched
      if (newEnrichedIds.has(tx.txid)) return;
      
      // Check if this tx has OP_RETURN (potential rune)
      const hasRunestone = tx.vout.some((out: any) => 
        out.scriptpubkey?.startsWith('6a5d') || 
        out.scriptpubkey_type === 'op_return'
      );
      
      // Always call the enrichment API - it handles both runes AND ordinals
      try {
        const response = await fetch(`${API_URL}/api/tx-enrich/${tx.txid}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.type === 'rune') {
            newEnrichments.set(tx.txid, {
              type: 'rune',
              runeId: data.runeId,
              runeName: data.runeName,
              runeSymbol: data.runeSymbol,
              runeAmount: data.runeAmount,
              thumbnail: data.thumbnail,
            });
            newEnrichedIds.add(tx.txid);
            console.log(`✅ Rune: ${data.runeName}`);
            return;
          }
          
          if (data.success && data.type === 'ordinal') {
            newEnrichments.set(tx.txid, {
              type: 'ordinal',
              inscriptionId: data.inscriptionId,
              inscriptionNumber: data.inscriptionNumber,
              thumbnail: data.thumbnail,
              contentUrl: data.contentUrl,
            });
            newEnrichedIds.add(tx.txid);
            console.log(`✅ Ordinal: #${data.inscriptionNumber}`);
            return;
          }
          
          // BTC transaction
          newEnrichments.set(tx.txid, { type: 'btc' });
          newEnrichedIds.add(tx.txid);
          return;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to enrich tx ${tx.txid.slice(0,8)}:`, e);
      }
      
      // Fallback based on heuristics if API fails
      if (hasRunestone) {
        newEnrichments.set(tx.txid, {
          type: 'rune',
          runeName: 'Rune Transfer',
          runeSymbol: '⧈',
        });
      } else {
        // Check for ordinal (small value output)
        const hasSmallOutput = tx.vout.some((out: any) => 
          out.value && out.value >= 330 && out.value <= 10000
        );
        
        if (hasSmallOutput && tx.vout.length <= 3) {
          newEnrichments.set(tx.txid, { type: 'ordinal' });
        } else {
          newEnrichments.set(tx.txid, { type: 'btc' });
        }
      }
      newEnrichedIds.add(tx.txid);
    }));
    
    setEnrichments(newEnrichments);
    setEnrichedTxIds(newEnrichedIds);
    setLoadingEnrichments(false);
  }, [enrichments, enrichedTxIds]);

  // Sort transactions: pending first, then by time
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!a.status.confirmed && b.status.confirmed) return -1;
    if (a.status.confirmed && !b.status.confirmed) return 1;
    const timeA = a.status.block_time || Date.now() / 1000;
    const timeB = b.status.block_time || Date.now() / 1000;
    return timeB - timeA;
  });

  // Get currently visible transactions
  const visibleTransactions = sortedTransactions.slice(0, visibleCount);

  // Enrich only visible transactions that haven't been enriched yet
  useEffect(() => {
    const txsToEnrich = visibleTransactions.filter(tx => !enrichedTxIds.has(tx.txid));
    if (txsToEnrich.length > 0) {
      enrichBatch(txsToEnrich);
    }
  }, [visibleCount, transactions.length]);

  // Load more handler
  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, sortedTransactions.length));
  }, [sortedTransactions.length]);
  
  if (transactions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📜</Text>
        <Text style={styles.emptyTitle}>No Transactions</Text>
        <Text style={styles.emptyText}>
          Your transaction history will appear here
        </Text>
      </View>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const calculateAmount = (tx: Transaction): { amount: number; isReceive: boolean; isSale?: boolean; isBuy?: boolean; isMarket?: boolean; price?: number } => {
    if (!address) {
      const totalIn = tx.vin.reduce((sum, input) => sum + (input.prevout?.value || 0), 0);
      const totalOut = tx.vout.reduce((sum, output) => sum + (output.value || 0), 0);
      const isReceive = totalOut > totalIn - (tx.fee || 0);
      return { amount: Math.abs(totalOut - totalIn), isReceive };
    }

    let receivedAmount = 0;
    let sentFromWallet = false;
    const INSCRIPTION_THRESHOLD = 600; // Typical inscription UTXO is 546-555 sats
    
    // Track inputs from our wallet
    const ourInputs: number[] = [];
    tx.vin.forEach((input: any) => {
      if (input.prevout?.scriptpubkey_address === address) {
        sentFromWallet = true;
        ourInputs.push(input.prevout?.value || 0);
      }
    });
    
    // Track outputs to our wallet  
    const ourOutputs: number[] = [];
    tx.vout.forEach((output: any) => {
      if (output.scriptpubkey_address === address) {
        const value = output.value || 0;
        receivedAmount += value;
        ourOutputs.push(value);
      }
    });
    
    // Count total participants (more than 2 unique addresses = likely market tx)
    const allAddresses = new Set<string>();
    tx.vin.forEach((input: any) => {
      if (input.prevout?.scriptpubkey_address) allAddresses.add(input.prevout.scriptpubkey_address);
    });
    tx.vout.forEach((output: any) => {
      if (output.scriptpubkey_address) allAddresses.add(output.scriptpubkey_address);
    });
    const isMultiParty = allAddresses.size >= 3; // Seller, Buyer, Market Fee = 3+ addresses
    
    if (sentFromWallet) {
      const totalInputFromUs = ourInputs.reduce((sum, v) => sum + v, 0);
      
      // Check if we sent a small UTXO (likely inscription) and received more = SALE
      const sentSmallUtxo = ourInputs.some(v => v <= INSCRIPTION_THRESHOLD);
      const smallUtxoSent = ourInputs.find(v => v <= INSCRIPTION_THRESHOLD) || 0;
      // Check if we received a small UTXO (likely inscription) = BUY
      const receivedSmallUtxo = ourOutputs.some(v => v <= INSCRIPTION_THRESHOLD);
      
      if (receivedAmount > totalInputFromUs) {
        // SALE: received more than sent = profit (seller in atomic swap)
        // Seller sends inscription UTXO (~555) and receives payment
        // PRICE = what seller received (the payment for the inscription)
        const price = receivedAmount; // Total received = inscription price + original UTXO value back? No, just the payment
        const profit = receivedAmount - totalInputFromUs;
        const isMarket = sentSmallUtxo && isMultiParty;
        return { amount: receivedAmount, price: receivedAmount, isReceive: true, isSale: sentSmallUtxo, isMarket };
      } else {
        // Spent more than received back
        const sentAmount = totalInputFromUs - receivedAmount;
        
        // BUY: if we received a small UTXO (inscription) while spending more
        // Buyer sends payment and receives inscription (~555) + change
        // PRICE = total spent (excluding network fee ideally, but we include it for simplicity)
        if (receivedSmallUtxo && sentAmount > 0) {
          const isMarket = isMultiParty;
          // Price = what we paid (sent - change received)
          // But we want to show total cost to user
          return { amount: sentAmount, price: sentAmount, isReceive: false, isBuy: true, isMarket };
        }
        
        // NORMAL SEND: just spent money
        return { amount: sentAmount, isReceive: false };
      }
    } else {
      // Pure receive (no inputs from us)
      const receivedSmallUtxo = ourOutputs.some(v => v <= INSCRIPTION_THRESHOLD);
      return { amount: receivedAmount, isReceive: true, isBuy: receivedSmallUtxo };
    }
  };

  const openTransaction = (txid: string) => {
    Linking.openURL(`https://kray.space/krayscan.html?txid=${txid}`);
  };

  const formatAmount = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(4)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => {
    const result = calculateAmount(item);
    const { amount, isReceive } = result;
    const isSale = 'isSale' in result && result.isSale;
    const isBuy = 'isBuy' in result && result.isBuy;
    const isMarket = 'isMarket' in result && result.isMarket;
    const isPending = !item.status.confirmed;
    const enrichment = enrichments.get(item.txid);
    const isRuneTx = enrichment?.type === 'rune';
    const isOrdinalTx = enrichment?.type === 'ordinal';
    
    return (
      <TouchableOpacity 
        style={[styles.txItem, isPending && styles.txItemPending]} 
        onPress={() => openTransaction(item.txid)}
        activeOpacity={0.7}
      >
        {/* Icon - shows UNIQUE thumbnail for runes AND ordinals */}
        {(isRuneTx || isOrdinalTx) && enrichment?.thumbnail ? (
          <View style={styles.txIconContainer}>
            <Image 
              source={{ uri: enrichment.thumbnail }} 
              style={styles.txThumbnail}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[
            styles.txIcon, 
            isRuneTx ? styles.txIconRune :
            isOrdinalTx ? styles.txIconOrdinal :
            isReceive ? styles.txIconReceive : styles.txIconSend
          ]}>
            {isRuneTx ? (
              <Text style={styles.runeSymbolIcon}>{enrichment?.runeSymbol || '⧈'}</Text>
            ) : isOrdinalTx ? (
              <Text style={styles.ordinalSymbolIcon}>◉</Text>
            ) : (
              <Ionicons
                name={isReceive ? 'arrow-down' : 'arrow-up'}
                size={18}
                color={isReceive ? '#10b981' : '#f59e0b'}
              />
            )}
          </View>
        )}
        
        <View style={styles.txInfo}>
          <View style={styles.txRow}>
            <View style={styles.txTypeRow}>
              <Text style={styles.txType}>
                {isRuneTx 
                  ? (isMarket && isSale ? 'Sold Rune' : isMarket && isBuy ? 'Bought Rune' : isReceive ? 'Received Rune' : 'Sent Rune') 
                  : isOrdinalTx 
                    ? (isMarket && isSale ? 'Sold Ordinal' : isMarket && isBuy ? 'Bought Ordinal' : isReceive ? 'Received Ordinal' : 'Sent Ordinal') 
                    : (isMarket && isSale ? 'Sold' : isMarket && isBuy ? 'Bought' : isReceive ? 'Received' : 'Sent')}
              </Text>
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>⏳</Text>
                </View>
              )}
              {isRuneTx && (
                <View style={styles.runeBadge}>
                  <Text style={styles.runeBadgeText}>⧈</Text>
                </View>
              )}
              {isOrdinalTx && (
                <View style={styles.ordinalBadge}>
                  <Text style={styles.ordinalBadgeText}>◉</Text>
                </View>
              )}
              {isMarket && (
                <View style={styles.marketBadge}>
                  <Text style={styles.marketBadgeText}>🏪 Market</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.txAmount, 
              (isMarket && isSale) ? styles.txAmountSale : 
              (isMarket && isBuy) ? styles.txAmountBuy : 
              isReceive ? styles.txAmountReceive : styles.txAmountSend
            ]}>
              {isRuneTx && enrichment?.runeAmount 
                ? `${isReceive ? '+' : '-'}${enrichment.runeAmount}`
                : `${isReceive ? '+' : '-'}${formatAmount(amount)}`
              }
            </Text>
          </View>
          
          {/* Show rune name and symbol if available */}
          {isRuneTx && enrichment?.runeName && (
            <Text style={styles.runeNameText} numberOfLines={1}>
              {enrichment.runeName} {enrichment.runeSymbol}
            </Text>
          )}
          
          {/* Show inscription number for ordinals */}
          {isOrdinalTx && (
            <Text style={styles.ordinalNameText} numberOfLines={1}>
              {enrichment?.inscriptionNumber 
                ? `Inscription #${enrichment.inscriptionNumber.toLocaleString()}`
                : enrichment?.inscriptionId 
                  ? `${enrichment.inscriptionId.slice(0, 12)}...`
                  : 'Ordinal Transfer'
              }
            </Text>
          )}
          
          <View style={styles.txRow}>
            <Text style={styles.txId} numberOfLines={1}>
              {item.txid.slice(0, 16)}...
            </Text>
            <View style={styles.txStatus}>
              {item.status.confirmed ? (
                <>
                  <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  <Text style={styles.txTime}>
                    {item.status.block_time ? formatTime(item.status.block_time) : 'Confirmed'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={12} color="#f59e0b" />
                  <Text style={styles.txPending}>In mempool</Text>
                </>
              )}
            </View>
          </View>
        </View>
        
        <Ionicons name="open-outline" size={14} color="#666" style={styles.txOpenIcon} />
      </TouchableOpacity>
    );
  };

  const hasMore = visibleCount < sortedTransactions.length;

  return (
    <View style={styles.container}>
      {loadingEnrichments && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      )}
      <FlatList
        data={visibleTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.txid}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity 
              style={styles.loadMoreButton} 
              onPress={loadMore}
              disabled={loadingEnrichments}
            >
              <Text style={styles.loadMoreText}>
                View More ({sortedTransactions.length - visibleCount} remaining)
              </Text>
              <Ionicons name="chevron-down" size={16} color="#888" />
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
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
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  txItemPending: {
    borderColor: 'rgba(245,158,11,0.4)',
    backgroundColor: 'rgba(245,158,11,0.05)',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconReceive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  txIconSend: {
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  txIconRune: {
    backgroundColor: 'rgba(247,147,26,0.15)',
  },
  txIconOrdinal: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(247,147,26,0.1)',
  },
  txThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  runeSymbolIcon: {
    fontSize: 18,
    color: '#f7931a',
  },
  ordinalSymbolIcon: {
    fontSize: 18,
    color: '#fff',
  },
  runeBadge: {
    backgroundColor: 'rgba(247,147,26,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  runeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f7931a',
  },
  ordinalBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ordinalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  marketBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  marketBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  runeNameText: {
    fontSize: 12,
    color: '#f7931a',
    marginBottom: 2,
  },
  ordinalNameText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 2,
  },
  txInfo: {
    flex: 1,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.5,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txAmountReceive: {
    color: '#10b981', // Green for received
  },
  txAmountSend: {
    color: '#f59e0b', // Orange for sent
  },
  txAmountBuy: {
    color: '#f7931a', // Bitcoin orange for purchases
  },
  txAmountSale: {
    color: '#10b981', // Green for sales (you earned!)
  },
  txId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  txStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txTime: {
    fontSize: 11,
    color: '#888',
  },
  txPending: {
    fontSize: 11,
    color: '#f59e0b',
  },
  txOpenIcon: {
    marginLeft: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  loadMoreText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
});
