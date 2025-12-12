/**
 * Listing Modal Component
 * Full Buy Now listing flow with PSBT signing
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../context/WalletContext';
import * as api from '../services/api';

interface ListingModalProps {
  visible: boolean;
  onClose: () => void;
  inscription: { id: string; inscriptionId: string; inscriptionNumber?: number | null; contentType?: string; thumbnail: string; value?: number; } | null;
  onSuccess?: (orderId: string) => void;
}

type Step = 'price' | 'password' | 'signing' | 'success' | 'error';

export function ListingModal({ visible, onClose, inscription, onSuccess }: ListingModalProps) {
  const { wallet, signPsbt } = useWallet();
  const [step, setStep] = useState<Step>('price');
  const [error, setError] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<'sats' | 'btc'>('sats');
  const [password, setPassword] = useState('');
  const [orderId, setOrderId] = useState('');
  const [psbtToSign, setPsbtToSign] = useState('');

  useEffect(() => {
    if (visible) { setStep('price'); setError(''); setPrice(''); setPassword(''); setOrderId(''); setPsbtToSign(''); }
  }, [visible]);

  const getPriceInSats = (): number => {
    const value = parseFloat(price);
    if (isNaN(value)) return 0;
    return priceUnit === 'btc' ? Math.floor(value * 100000000) : Math.floor(value);
  };

  const handleSubmitPrice = async () => {
    const priceSats = getPriceInSats();
    if (priceSats < 546) { setError('Price must be at least 546 sats'); return; }
    if (!inscription || !wallet?.address) { setError('Invalid inscription or wallet'); return; }
    setError(''); setStep('signing');
    try {
      const response = await api.createBuyNowListing({
        inscription_id: inscription.inscriptionId, price_sats: priceSats, seller_address: wallet.address,
        inscription_number: inscription.inscriptionNumber, content_type: inscription.contentType,
      });
      if (!response.success) throw new Error(response.error || 'Failed to create listing');
      setOrderId(response.order_id); setPsbtToSign(response.psbt_base64); setStep('password');
    } catch (err: any) { setError(err.message || 'Failed to create listing'); setStep('error'); }
  };

  const handleSignAndConfirm = async () => {
    if (!password || !psbtToSign || !orderId) { setError('Missing required data'); return; }
    setStep('signing'); setError('');
    try {
      const signedPsbt = await signPsbt(psbtToSign, password, 0x82);
      const confirmResponse = await api.confirmBuyNowListing({ order_id: orderId, signed_psbt: signedPsbt });
      if (!confirmResponse.success) throw new Error(confirmResponse.error || 'Failed to confirm listing');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('success');
      if (onSuccess) onSuccess(orderId);
    } catch (err: any) {
      setError(err.message || 'Failed to complete listing'); setStep('error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const formatPrice = (sats: number) => sats >= 100000000 ? `${(sats / 100000000).toFixed(8)} BTC` : `${sats.toLocaleString()} sats`;

  const renderContent = () => {
    switch (step) {
      case 'price': return (<>
        <Text style={styles.title}>List for Sale</Text>
        {inscription && (<View style={styles.previewCard}>
          <Image source={{ uri: inscription.thumbnail }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewInfo}>
            <Text style={styles.previewNumber}>{inscription.inscriptionNumber ? `Inscription #${inscription.inscriptionNumber.toLocaleString()}` : 'Inscription'}</Text>
            <Text style={styles.previewType}>{inscription.contentType || 'Unknown'}</Text>
          </View>
        </View>)}
        <View style={styles.section}>
          <Text style={styles.label}>LISTING PRICE</Text>
          <View style={styles.priceRow}>
            <TextInput style={styles.priceInput} placeholder="0" placeholderTextColor="#666" value={price} onChangeText={setPrice} keyboardType="decimal-pad" autoFocus />
            <View style={styles.unitSelector}>
              <TouchableOpacity style={[styles.unitBtn, priceUnit === 'sats' && styles.unitBtnActive]} onPress={() => setPriceUnit('sats')}><Text style={[styles.unitText, priceUnit === 'sats' && styles.unitTextActive]}>SATS</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.unitBtn, priceUnit === 'btc' && styles.unitBtnActive]} onPress={() => setPriceUnit('btc')}><Text style={[styles.unitText, priceUnit === 'btc' && styles.unitTextActive]}>BTC</Text></TouchableOpacity>
            </View>
          </View>
          {price && <Text style={styles.pricePreview}>= {formatPrice(getPriceInSats())}</Text>}
        </View>
        <View style={styles.feeInfo}><Ionicons name="information-circle-outline" size={16} color="#888" /><Text style={styles.feeText}>2% marketplace fee on sale</Text></View>
        {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={16} color="#ef4444" /><Text style={styles.errorText}>{error}</Text></View>}
        <TouchableOpacity style={[styles.primaryBtn, !price && styles.btnDisabled]} onPress={handleSubmitPrice} disabled={!price}><Text style={styles.primaryBtnText}>Continue</Text><Ionicons name="arrow-forward" size={18} color="#000" /></TouchableOpacity>
      </>);
      case 'password': return (<>
        <Text style={styles.title}>Sign Listing</Text>
        <View style={styles.signingInfo}><Ionicons name="key" size={32} color="#f7931a" /><Text style={styles.signingText}>Enter your password to sign the listing</Text><Text style={styles.signingSubtext}>This authorizes the sale of your inscription</Text></View>
        <View style={styles.section}><Text style={styles.label}>WALLET PASSWORD</Text><TextInput style={styles.input} placeholder="Enter password" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry autoFocus /></View>
        {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={16} color="#ef4444" /><Text style={styles.errorText}>{error}</Text></View>}
        <TouchableOpacity style={[styles.primaryBtn, !password && styles.btnDisabled]} onPress={handleSignAndConfirm} disabled={!password}><Ionicons name="create" size={18} color="#000" /><Text style={styles.primaryBtnText}>Sign & List</Text></TouchableOpacity>
      </>);
      case 'signing': return (<View style={styles.loadingState}><ActivityIndicator size="large" color="#f7931a" /><Text style={styles.loadingText}>Creating listing...</Text><Text style={styles.loadingSubtext}>Please wait</Text></View>);
      case 'success': return (<View style={styles.successState}><View style={styles.successIcon}><Ionicons name="checkmark-circle" size={64} color="#10b981" /></View><Text style={styles.successTitle}>Listed Successfully!</Text><Text style={styles.successText}>Your inscription is now listed for {formatPrice(getPriceInSats())}</Text><View style={styles.orderIdBox}><Text style={styles.orderIdLabel}>Order ID</Text><Text style={styles.orderIdValue} numberOfLines={1}>{orderId}</Text></View><TouchableOpacity style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryBtnText}>Done</Text></TouchableOpacity></View>);
      case 'error': return (<View style={styles.errorState}><View style={styles.errorIcon}><Ionicons name="close-circle" size={64} color="#ef4444" /></View><Text style={styles.errorTitle}>Listing Failed</Text><Text style={styles.errorStateText}>{error}</Text><View style={styles.errorActions}><TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('price')}><Text style={styles.secondaryBtnText}>Try Again</Text></TouchableOpacity><TouchableOpacity style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryBtnText}>Close</Text></TouchableOpacity></View></View>);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            <View style={styles.steps}>{['price', 'password', 'success'].map((s) => (<View key={s} style={[styles.stepDot, (step === s || (step === 'signing' && s === 'password') || (step === 'error' && (s === 'price' || s === 'password'))) && styles.stepDotActive]} />))}</View>
          </View>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>{renderContent()}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  closeBtn: { padding: 4 },
  steps: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepDotActive: { backgroundColor: '#f7931a' },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 20 },
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginBottom: 24, gap: 12 },
  previewImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#222' },
  previewInfo: { flex: 1 },
  previewNumber: { fontSize: 15, fontWeight: '600', color: '#fff' },
  previewType: { fontSize: 12, color: '#888', marginTop: 2 },
  section: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8, letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  unitSelector: { flexDirection: 'column', gap: 4 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  unitBtnActive: { backgroundColor: 'rgba(247,147,26,0.2)', borderColor: '#f7931a' },
  unitText: { fontSize: 11, fontWeight: '600', color: '#666' },
  unitTextActive: { color: '#f7931a' },
  pricePreview: { fontSize: 13, color: '#10b981', marginTop: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  feeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  feeText: { fontSize: 13, color: '#888' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#ef4444', flex: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f7931a', padding: 16, borderRadius: 14 },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  secondaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  signingInfo: { alignItems: 'center', padding: 24, marginBottom: 20 },
  signingText: { fontSize: 16, color: '#fff', textAlign: 'center', marginTop: 16 },
  signingSubtext: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8 },
  loadingState: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 20 },
  loadingSubtext: { fontSize: 14, color: '#888', marginTop: 8 },
  successState: { alignItems: 'center' },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#10b981', marginBottom: 8 },
  successText: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  orderIdBox: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 24 },
  orderIdLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 4 },
  orderIdValue: { fontSize: 12, color: '#fff', fontFamily: 'monospace' },
  errorState: { alignItems: 'center' },
  errorIcon: { marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#ef4444', marginBottom: 8 },
  errorStateText: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  errorActions: { flexDirection: 'row', gap: 12, width: '100%' },
});




