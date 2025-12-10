/**
 * Receive Screen
 * KRAY OS Style - Black & White
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
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../context/WalletContext';
import colors from '../theme/colors';

interface ReceiveScreenProps {
  onBack: () => void;
}

export function ReceiveScreen({ onBack }: ReceiveScreenProps) {
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const address = wallet?.address || '';

  const handleCopy = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (address) {
      await Share.share({
        message: address,
        title: 'My Bitcoin Address',
      });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              {address ? (
                <QRCode
                  value={`bitcoin:${address}`}
                  size={200}
                  backgroundColor={colors.white}
                  color={colors.black}
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
            <Text style={styles.addressLabel}>YOUR ADDRESS</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.addressCard}>
              <Text style={styles.addressText} numberOfLines={2}>
                {address || '...'}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={20}
                color={copied ? colors.success : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopy} activeOpacity={0.8}>
              <Ionicons name="copy" size={20} color={colors.buttonPrimaryText} />
              <Text style={styles.actionButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonAlt} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.actionButtonTextAlt}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={20} color={colors.textMuted} />
            <Text style={styles.noticeText}>
              Only send Bitcoin (BTC) to this address. Sending other assets may result in permanent loss.
            </Text>
          </View>
        </View>
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    marginVertical: 30,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    color: colors.textMuted,
  },
  addressSection: {
    width: '100%',
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    marginRight: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  actionButtonAlt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.buttonSecondaryBorder,
  },
  actionButtonTextAlt: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.buttonSecondaryText,
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 10,
    lineHeight: 18,
  },
});
