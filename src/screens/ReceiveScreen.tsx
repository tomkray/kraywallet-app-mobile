/**
 * Receive Screen
 * Display QR code for receiving Bitcoin
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../context/WalletContext';

interface ReceiveScreenProps {
  onBack: () => void;
}

export function ReceiveScreen({ onBack }: ReceiveScreenProps) {
  const { wallet } = useWallet();
  
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (wallet?.address) {
      await Clipboard.setStringAsync(wallet.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (wallet?.address) {
      try {
        await Share.share({
          message: wallet.address,
          title: 'My Bitcoin Address',
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive Bitcoin</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              {wallet?.address ? (
                <QRCode
                  value={`bitcoin:${wallet.address}`}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>Loading...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Address Display */}
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Your Bitcoin Address</Text>
            <View style={styles.addressBox}>
              <Text style={styles.addressText} selectable>
                {wallet?.address || 'Loading...'}
              </Text>
            </View>

            {/* Address Type Badge */}
            <View style={styles.addressType}>
              <Ionicons name="shield-checkmark" size={14} color="#f7931a" />
              <Text style={styles.addressTypeText}>Taproot (P2TR)</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
              <LinearGradient
                colors={copied ? ['#10b981', '#059669'] : ['#f7931a', '#e67e00']}
                style={styles.actionButtonGradient}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>
                  {copied ? 'Copied!' : 'Copy Address'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#f7931a" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Info Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.noticeText}>
              Only send Bitcoin (BTC) to this address. Sending other assets may result in permanent loss.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    marginVertical: 32,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  qrPlaceholderText: {
    color: '#888',
  },
  addressSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  addressBox: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addressText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  addressType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  addressTypeText: {
    fontSize: 12,
    color: '#f7931a',
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(247,147,26,0.4)',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f7931a',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
});

