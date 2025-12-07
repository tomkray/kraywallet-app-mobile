/**
 * Main Wallet Screen
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';

// Tab Components
import { OrdinalsTab } from '../components/tabs/OrdinalsTab';
import { RunesTab } from '../components/tabs/RunesTab';
import { ActivityTab } from '../components/tabs/ActivityTab';
import { L2Tab } from '../components/tabs/L2Tab';

interface MainWalletScreenProps {
  onSettings: () => void;
  onSend: () => void;
  onReceive: () => void;
}

type TabType = 'ordinals' | 'runes' | 'activity' | 'l2';
type NetworkType = 'mainnet' | 'kray-l2' | 'testnet';

export function MainWalletScreen({ onSettings, onSend, onReceive }: MainWalletScreenProps) {
  const { wallet, network, l2, refreshAll, switchNetwork } = useWallet();
  
  const [activeTab, setActiveTab] = useState<TabType>('ordinals');
  const [refreshing, setRefreshing] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    refreshAll();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshAll();
    setRefreshing(false);
  };

  const handleCopyAddress = async () => {
    if (wallet?.address) {
      await Clipboard.setStringAsync(wallet.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNetworkChange = async (newNetwork: NetworkType) => {
    await switchNetwork(newNetwork);
    setShowNetworkDropdown(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const formatBalance = (sats: number) => sats.toLocaleString();
  const formatBTC = (sats: number) => (sats / 100000000).toFixed(8);

  const getNetworkIcon = (net: NetworkType) => {
    switch (net) {
      case 'mainnet': return '₿';
      case 'kray-l2': return '⚡';
      case 'testnet': return '🧪';
    }
  };

  const getNetworkName = (net: NetworkType) => {
    switch (net) {
      case 'mainnet': return 'Mainnet';
      case 'kray-l2': return 'KRAY L2';
      case 'testnet': return 'Testnet';
    }
  };

  const isL2 = network === 'kray-l2';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.networkSelector}
            onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
          >
            <Text style={styles.networkIcon}>{getNetworkIcon(network as NetworkType)}</Text>
            <Text style={styles.networkName}>{getNetworkName(network as NetworkType)}</Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Network Dropdown */}
        {showNetworkDropdown && (
          <View style={styles.networkDropdown}>
            <TouchableOpacity
              style={[styles.networkOption, network === 'mainnet' && styles.networkOptionActive]}
              onPress={() => handleNetworkChange('mainnet')}
            >
              <Text style={styles.networkOptionIcon}>₿</Text>
              <Text style={styles.networkOptionText}>Mainnet</Text>
              {network === 'mainnet' && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.networkOption, network === 'kray-l2' && styles.networkOptionActive]}
              onPress={() => handleNetworkChange('kray-l2')}
            >
              <Text style={styles.networkOptionIcon}>⚡</Text>
              <Text style={styles.networkOptionText}>KRAY L2</Text>
              {network === 'kray-l2' && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.networkOption, network === 'testnet' && styles.networkOptionActive]}
              onPress={() => handleNetworkChange('testnet')}
            >
              <Text style={styles.networkOptionIcon}>🧪</Text>
              <Text style={styles.networkOptionText}>Testnet</Text>
              {network === 'testnet' && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fff"
              colors={['#fff']}
            />
          }
        >
          {/* Address Card */}
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>My Wallet</Text>
            <TouchableOpacity onPress={handleCopyAddress} style={styles.addressRow}>
              <Text style={styles.addressText}>
                {wallet?.address ? `${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}` : '...'}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copied ? '#10b981' : '#666'}
              />
            </TouchableOpacity>
          </View>

          {/* Balance Section */}
          <View style={styles.balanceSection}>
            {isL2 ? (
              <>
                <View style={styles.l2StatusRow}>
                  <View style={[styles.l2StatusDot, l2.isConnected && styles.l2StatusDotConnected]} />
                  <Text style={styles.l2StatusText}>
                    {l2.isConnected ? 'Connected' : 'Offline'}
                  </Text>
                </View>
                <Text style={styles.balanceLabel}>KRAY Balance</Text>
                <Text style={styles.balanceAmount}>
                  {l2.balanceKray.toLocaleString()} <Text style={styles.balanceUnit}>KRAY</Text>
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>
                  {formatBalance(wallet?.balanceSats || 0)} <Text style={styles.balanceUnit}>sats</Text>
                </Text>
                <Text style={styles.balanceBTC}>
                  {formatBTC(wallet?.balanceSats || 0)} BTC
                </Text>
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={onSend} activeOpacity={0.8}>
              <View style={styles.actionButtonInner}>
                <Ionicons name="arrow-up" size={24} color="#000" />
                <Text style={styles.actionButtonText}>Send</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonAlt} onPress={onReceive} activeOpacity={0.8}>
              <View style={styles.actionButtonInnerAlt}>
                <Ionicons name="arrow-down" size={24} color="#fff" />
                <Text style={styles.actionButtonTextAlt}>Receive</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          {isL2 ? (
            <L2Tab />
          ) : (
            <>
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'ordinals' && styles.tabActive]}
                  onPress={() => setActiveTab('ordinals')}
                >
                  <Text style={[styles.tabText, activeTab === 'ordinals' && styles.tabTextActive]}>
                    Ordinals
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'runes' && styles.tabActive]}
                  onPress={() => setActiveTab('runes')}
                >
                  <Text style={[styles.tabText, activeTab === 'runes' && styles.tabTextActive]}>
                    Runes
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
                  onPress={() => setActiveTab('activity')}
                >
                  <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
                    Activity
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tabContent}>
                {activeTab === 'ordinals' && <OrdinalsTab ordinals={wallet?.ordinals || []} />}
                {activeTab === 'runes' && <RunesTab runes={wallet?.runes || []} />}
                {activeTab === 'activity' && <ActivityTab transactions={wallet?.transactions || []} />}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  networkIcon: {
    fontSize: 16,
  },
  networkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  networkDropdown: {
    position: 'absolute',
    top: 65,
    left: 16,
    right: 100,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 8,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
  },
  networkOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  networkOptionIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  networkOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  addressCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'monospace',
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  balanceUnit: {
    fontSize: 18,
    fontWeight: '400',
    color: '#666',
  },
  balanceBTC: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
  },
  l2StatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  l2StatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  l2StatusDotConnected: {
    backgroundColor: '#10b981',
  },
  l2StatusText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  actionButtonAlt: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionButtonInnerAlt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionButtonTextAlt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#000',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
