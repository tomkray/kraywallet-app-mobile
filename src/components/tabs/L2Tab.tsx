/**
 * L2 Tab Component
 * KRAY L2 features: deposit, withdraw, transfer, swap
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../context/WalletContext';

export function L2Tab() {
  const { l2, wallet } = useWallet();
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const getMembershipBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'common': return { icon: '🪨', color: '#808080', name: 'Common' };
      case 'amethyst': return { icon: '💜', color: '#9966cc', name: 'Amethyst' };
      case 'gold': return { icon: '🥇', color: '#ffd700', name: 'Gold' };
      case 'diamond': return { icon: '💎', color: '#b9f2ff', name: 'Diamond' };
      case 'black': return { icon: '🖤', color: '#ffffff', name: 'Black' };
      default: return { icon: '👤', color: '#888', name: 'No Card' };
    }
  };

  const membership = getMembershipBadge(l2.membership.tier);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* L2 Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusIcon}>⚡</Text>
            <View>
              <Text style={styles.statusLabel}>KRAY SPACE</Text>
              <Text style={styles.statusTitle}>Layer 2</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, l2.isConnected && styles.statusBadgeConnected]}>
            <View style={[styles.statusDot, l2.isConnected && styles.statusDotConnected]} />
            <Text style={[styles.statusText, l2.isConnected && styles.statusTextConnected]}>
              {l2.isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Token Balances */}
        <View style={styles.balances}>
          <Text style={styles.balancesTitle}>Your Tokens</Text>
          
          <View style={styles.tokenRow}>
            <View style={styles.tokenLeft}>
              <Text style={styles.tokenIcon}>⚡</Text>
              <Text style={styles.tokenName}>KRAY</Text>
            </View>
            <View style={styles.tokenRight}>
              <Text style={styles.tokenBalance}>{l2.balanceKray.toLocaleString()}</Text>
              <Text style={styles.tokenLabel}>Gas Token</Text>
            </View>
          </View>

          {l2.balanceDog > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <Text style={styles.tokenIcon}>🐕</Text>
                <Text style={styles.tokenName}>DOG</Text>
              </View>
              <Text style={styles.tokenBalance}>{l2.balanceDog.toFixed(5)}</Text>
            </View>
          )}

          {l2.balanceDogsocial > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <Text style={styles.tokenIcon}>🎭</Text>
                <Text style={styles.tokenName}>DOGSOCIAL</Text>
              </View>
              <Text style={styles.tokenBalance}>{l2.balanceDogsocial.toFixed(5)}</Text>
            </View>
          )}

          {l2.balanceRadiola > 0 && (
            <View style={styles.tokenRow}>
              <View style={styles.tokenLeft}>
                <Text style={styles.tokenIcon}>🎵</Text>
                <Text style={styles.tokenName}>RADIOLA</Text>
              </View>
              <Text style={styles.tokenBalance}>{l2.balanceRadiola.toFixed(5)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Membership Card */}
      <View style={styles.membershipCard}>
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipTitle}>🎴 Membership</Text>
          <View style={[styles.membershipBadge, { backgroundColor: `${membership.color}20` }]}>
            <Text style={styles.membershipIcon}>{membership.icon}</Text>
            <Text style={[styles.membershipName, { color: membership.color }]}>{membership.name}</Text>
          </View>
        </View>

        {/* Free TX Counter */}
        <View style={styles.freeTxCard}>
          <View>
            <Text style={styles.freeTxLabel}>Free Transactions Today</Text>
            <Text style={styles.freeTxSubtext}>Resets at midnight UTC</Text>
          </View>
          <View style={styles.freeTxRight}>
            <Text style={styles.freeTxCount}>
              {l2.membership.usedToday}/{l2.membership.freePerDay}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setShowDepositModal(true)}
        >
          <Text style={styles.actionIcon}>📥</Text>
          <Text style={styles.actionText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setShowWithdrawModal(true)}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* L2 Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>L2 Features</Text>

        <TouchableOpacity 
          style={styles.featureCard}
          onPress={() => setShowTransferModal(true)}
        >
          <View style={styles.featureLeft}>
            <Text style={styles.featureIcon}>💸</Text>
            <View>
              <Text style={styles.featureName}>L2 Transfer</Text>
              <Text style={styles.featureDesc}>Send tokens instantly</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.featureCard}
          onPress={() => setShowSwapModal(true)}
        >
          <View style={styles.featureLeft}>
            <Text style={styles.featureIcon}>🔄</Text>
            <View>
              <Text style={styles.featureName}>L2 Swap</Text>
              <Text style={styles.featureDesc}>Exchange tokens</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard}>
          <View style={styles.featureLeft}>
            <Text style={styles.featureIcon}>🏊</Text>
            <View>
              <Text style={styles.featureName}>Liquidity Pool</Text>
              <Text style={styles.featureDesc}>Provide liquidity</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Pending Withdrawals */}
      {l2.pendingWithdrawals.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>⏳ Pending Withdrawals</Text>
          {l2.pendingWithdrawals.map((withdrawal, index) => (
            <View key={index} style={styles.pendingItem}>
              <View style={styles.pendingLeft}>
                <Text style={styles.pendingAmount}>{withdrawal.amount} KRAY</Text>
                <Text style={styles.pendingStatus}>{withdrawal.status}</Text>
              </View>
              <Text style={styles.pendingTime}>~10 min</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  statusDotConnected: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  statusTextConnected: {
    color: '#10b981',
  },
  balances: {
    marginTop: 8,
  },
  balancesTitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 12,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenIcon: {
    fontSize: 16,
  },
  tokenName: {
    fontSize: 13,
    color: '#888',
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  tokenLabel: {
    fontSize: 10,
    color: '#666',
  },
  membershipCard: {
    marginBottom: 16,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  membershipIcon: {
    fontSize: 12,
  },
  membershipName: {
    fontSize: 11,
    fontWeight: '600',
  },
  freeTxCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  freeTxLabel: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 2,
  },
  freeTxSubtext: {
    fontSize: 10,
    color: '#666',
  },
  freeTxRight: {
    alignItems: 'flex-end',
  },
  freeTxCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#888',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  pendingLeft: {},
  pendingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pendingStatus: {
    fontSize: 11,
    color: '#f59e0b',
  },
  pendingTime: {
    fontSize: 12,
    color: '#888',
  },
  bottomPadding: {
    height: 40,
  },
});

