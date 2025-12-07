/**
 * Ordinals Tab Component
 * Display user's inscriptions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Ordinal {
  id: string;
  number: number;
  contentType: string;
  contentUrl?: string;
  preview?: string;
}

interface OrdinalsTabProps {
  ordinals: Ordinal[];
}

export function OrdinalsTab({ ordinals }: OrdinalsTabProps) {
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

  const renderOrdinal = ({ item }: { item: Ordinal }) => (
    <TouchableOpacity style={styles.ordinalItem}>
      <View style={styles.ordinalPreview}>
        {item.preview ? (
          <Image source={{ uri: item.preview }} style={styles.ordinalImage} />
        ) : (
          <View style={styles.ordinalPlaceholder}>
            <Text style={styles.ordinalPlaceholderText}>
              {item.contentType.split('/')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.ordinalInfo}>
        <Text style={styles.ordinalNumber}>#{item.number.toLocaleString()}</Text>
        <Text style={styles.ordinalType}>{item.contentType}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={ordinals}
      renderItem={renderOrdinal}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
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
  row: {
    gap: 12,
    marginBottom: 12,
  },
  ordinalItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ordinalPreview: {
    aspectRatio: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ordinalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ordinalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordinalPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  ordinalInfo: {
    padding: 12,
  },
  ordinalNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  ordinalType: {
    fontSize: 11,
    color: '#888',
  },
});

