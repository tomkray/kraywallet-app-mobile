/**
 * Activity Tab Component
 * Transaction history
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
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
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const calculateAmount = (tx: Transaction): { amount: number; isReceive: boolean } => {
    // Simplified calculation - in production, compare with wallet address
    let totalIn = 0;
    let totalOut = 0;
    
    tx.vin.forEach((input: any) => {
      if (input.prevout?.value) {
        totalIn += input.prevout.value;
      }
    });
    
    tx.vout.forEach((output: any) => {
      totalOut += output.value || 0;
    });
    
    const fee = tx.fee || 0;
    const isReceive = totalOut > totalIn - fee;
    const amount = isReceive ? totalOut : totalIn - totalOut - fee;
    
    return { amount: Math.abs(amount), isReceive };
  };

  const formatAmount = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(4)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const { amount, isReceive } = calculateAmount(item);
    
    return (
      <TouchableOpacity style={styles.txItem}>
        <View style={[styles.txIcon, isReceive ? styles.txIconReceive : styles.txIconSend]}>
          <Ionicons
            name={isReceive ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={isReceive ? '#10b981' : '#f59e0b'}
          />
        </View>
        
        <View style={styles.txInfo}>
          <View style={styles.txRow}>
            <Text style={styles.txType}>
              {isReceive ? 'Received' : 'Sent'}
            </Text>
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
                  <View style={styles.pendingDot} />
                  <Text style={styles.txPending}>Pending</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.txid}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
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
  txType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  txPending: {
    fontSize: 11,
    color: '#f59e0b',
  },
});

