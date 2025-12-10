/**
 * Activity Tab Component
 * Transaction history with pending support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
} from 'react-native';

const INITIAL_LIMIT = 10; // Show only last 10 transactions initially
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

interface ActivityTabProps {
  transactions: Transaction[];
  address?: string;
}

export function ActivityTab({ transactions, address }: ActivityTabProps) {
  const [showAll, setShowAll] = useState(false);
  
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

  // Sort: pending first, then by time
  const sortedTransactions = [...transactions].sort((a, b) => {
    // Pending transactions first
    if (!a.status.confirmed && b.status.confirmed) return -1;
    if (a.status.confirmed && !b.status.confirmed) return 1;
    // Then by time
    const timeA = a.status.block_time || Date.now() / 1000;
    const timeB = b.status.block_time || Date.now() / 1000;
    return timeB - timeA;
  });

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

  const calculateAmount = (tx: Transaction): { amount: number; isReceive: boolean } => {
    if (!address) {
      // Fallback if no address
      const totalIn = tx.vin.reduce((sum, input) => sum + (input.prevout?.value || 0), 0);
      const totalOut = tx.vout.reduce((sum, output) => sum + (output.value || 0), 0);
      const isReceive = totalOut > totalIn - (tx.fee || 0);
      return { amount: Math.abs(totalOut - totalIn), isReceive };
    }

    // Calculate based on wallet address
    let receivedAmount = 0;
    let sentFromWallet = false;
    
    // Check if we sent this transaction (our address in inputs)
    tx.vin.forEach((input: any) => {
      if (input.prevout?.scriptpubkey_address === address) {
        sentFromWallet = true;
      }
    });
    
    // Sum outputs to our address
    tx.vout.forEach((output: any) => {
      if (output.scriptpubkey_address === address) {
        receivedAmount += output.value || 0;
      }
    });
    
    if (sentFromWallet) {
      // We sent - calculate how much we sent (excluding change)
      const totalInputFromUs = tx.vin
        .filter((input: any) => input.prevout?.scriptpubkey_address === address)
        .reduce((sum: number, input: any) => sum + (input.prevout?.value || 0), 0);
      const sentAmount = totalInputFromUs - receivedAmount - (tx.fee || 0);
      return { amount: Math.abs(sentAmount), isReceive: false };
    } else {
      // We received
      return { amount: receivedAmount, isReceive: true };
    }
  };

  const openTransaction = (txid: string) => {
    Linking.openURL(`https://krayscan.com/tx/${txid}`);
  };

  const formatAmount = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(4)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => {
    const { amount, isReceive } = calculateAmount(item);
    const isPending = !item.status.confirmed;
    
    return (
      <TouchableOpacity 
        style={[styles.txItem, isPending && styles.txItemPending]} 
        onPress={() => openTransaction(item.txid)}
        activeOpacity={0.7}
      >
        <View style={[styles.txIcon, isReceive ? styles.txIconReceive : styles.txIconSend]}>
          <Ionicons
            name={isReceive ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={isReceive ? '#10b981' : '#f59e0b'}
          />
        </View>
        
        <View style={styles.txInfo}>
          <View style={styles.txRow}>
            <View style={styles.txTypeRow}>
              <Text style={styles.txType}>
                {isReceive ? 'Received' : 'Sent'}
              </Text>
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>⏳ PENDING</Text>
                </View>
              )}
            </View>
            <Text style={[styles.txAmount, isReceive ? styles.txAmountReceive : styles.txAmountSend]}>
              {isReceive ? '+' : '-'}{formatAmount(amount)}
            </Text>
          </View>
          
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

  // Apply limit unless showAll is true
  const displayedTransactions = showAll 
    ? sortedTransactions 
    : sortedTransactions.slice(0, INITIAL_LIMIT);
  
  const hasMore = sortedTransactions.length > INITIAL_LIMIT;

  return (
    <FlatList
      data={displayedTransactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.txid}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        hasMore && !showAll ? (
          <TouchableOpacity 
            style={styles.loadMoreButton} 
            onPress={() => setShowAll(true)}
          >
            <Text style={styles.loadMoreText}>
              Ver mais ({sortedTransactions.length - INITIAL_LIMIT} transações)
            </Text>
            <Ionicons name="chevron-down" size={16} color="#f7931a" />
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
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
    color: '#10b981',
  },
  txAmountSend: {
    color: '#f59e0b',
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
    padding: 16,
    marginTop: 8,
    backgroundColor: 'rgba(247,147,26,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247,147,26,0.3)',
    gap: 8,
  },
  loadMoreText: {
    color: '#f7931a',
    fontSize: 14,
    fontWeight: '600',
  },
});

