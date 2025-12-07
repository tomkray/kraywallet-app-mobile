/**
 * Runes Tab Component
 * Display user's runes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Rune {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  divisibility: number;
}

interface RunesTabProps {
  runes: Rune[];
}

export function RunesTab({ runes }: RunesTabProps) {
  if (runes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>✨</Text>
        <Text style={styles.emptyTitle}>No Runes</Text>
        <Text style={styles.emptyText}>
          Your Runes tokens will appear here
        </Text>
        
        {/* Create Rune Button */}
        <TouchableOpacity style={styles.createButton}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonIcon}>✨</Text>
            <Text style={styles.createButtonText}>Create New Rune</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const formatBalance = (balance: number, divisibility: number) => {
    return (balance / Math.pow(10, divisibility)).toLocaleString(undefined, {
      maximumFractionDigits: divisibility,
    });
  };

  const renderRune = ({ item }: { item: Rune }) => (
    <TouchableOpacity style={styles.runeItem}>
      <View style={styles.runeIcon}>
        <Text style={styles.runeSymbol}>{item.symbol || '◆'}</Text>
      </View>
      <View style={styles.runeInfo}>
        <Text style={styles.runeName}>{item.name}</Text>
        <Text style={styles.runeBalance}>
          {formatBalance(item.balance, item.divisibility)} {item.symbol || item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Create Rune Button */}
      <TouchableOpacity style={styles.createButtonTop}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.createButtonGradientTop}
        >
          <Text style={styles.createButtonIcon}>✨</Text>
          <Text style={styles.createButtonText}>Create New Rune</Text>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={runes}
        renderItem={renderRune}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '80%',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonTop: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  createButtonGradientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  createButtonIcon: {
    fontSize: 18,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  list: {
    paddingBottom: 20,
  },
  runeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  runeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  runeSymbol: {
    fontSize: 20,
    color: '#8b5cf6',
  },
  runeInfo: {
    flex: 1,
  },
  runeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  runeBalance: {
    fontSize: 13,
    color: '#888',
  },
});

