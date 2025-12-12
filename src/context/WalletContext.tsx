/**
 * KrayWallet Context
 * Global state management for wallet data
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as storage from '../utils/storage';
import * as api from '../services/api';

// Types
interface WalletData {
  address: string;
  publicKey: string;
  balance: number;
  balanceSats: number;
  unconfirmedBalance: number;
  utxos: any[];
  transactions: any[];
  ordinals: any[];
  runes: any[];
}

interface L2Data {
  isConnected: boolean;
  balanceKray: number;
  balanceDog: number;
  balanceDogsocial: number;
  balanceRadiola: number;
  transactions: any[];
  membership: {
    tier: string;
    freePerDay: number;
    usedToday: number;
  };
  pendingWithdrawals: any[];
}

type Network = 'mainnet' | 'testnet' | 'kray-l2';

interface WalletContextType {
  // Wallet State
  hasWallet: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  wallet: WalletData | null;
  network: Network;
  
  // L2 State
  l2: L2Data;
  
  // Actions
  createWallet: (password: string, wordCount?: 12 | 24) => Promise<string[]>;
  restoreWallet: (mnemonic: string, password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  deleteWallet: () => Promise<void>;
  
  // Transaction Preparation (returns PSBT details for confirmation)
  prepareBitcoinTx: (toAddress: string, amountSats: number, feeRate: number) => Promise<api.PSBTDetails>;
  verifyPassword: (password: string) => Promise<boolean>;
  
  // PSBT Signing (for Buy Now / Market features)
  signPsbt: (psbtBase64: string, password: string, sighashType?: number, inputsToSign?: number[]) => Promise<string>;
  
  // Send Functions (Mainnet) - with password verification
  sendBitcoin: (toAddress: string, amountSats: number, feeRate: number, password: string) => Promise<string>;
  sendOrdinal: (inscriptionId: string, toAddress: string, password: string) => Promise<string>;
  sendRune: (runeId: string, toAddress: string, amount: string, password: string) => Promise<string>;
  
  // L2 Functions
  sendL2: (toAddress: string, amount: number, token: string, password: string) => Promise<string>;
  withdrawL2: (params: {
    amount: number;
    password: string;
    feeRate: number;
    feeUtxo: api.FeeUtxo;
    l2Fee: number;
  }) => Promise<string>;
  swapL2: (fromToken: string, toToken: string, amount: number) => Promise<string>;
  
  // Data Loading
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshOrdinals: () => Promise<void>;
  refreshRunes: () => Promise<void>;
  refreshL2: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Network
  switchNetwork: (network: Network) => void;
  
  // Utils
  getMnemonic: (password: string) => Promise<string | null>;
  signMessage: (message: string, password: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Secure Storage Keys
const STORAGE_KEYS = {
  ENCRYPTED_WALLET: 'kray_wallet_encrypted',
  HAS_WALLET: 'kray_has_wallet',
  NETWORK: 'kray_network',
};

// Simple encryption (browser-compatible)
const encrypt = (data: string, password: string): string => {
  // Use btoa for browser compatibility
  const payload = JSON.stringify({ data, check: password.slice(0, 4) });
  return btoa(unescape(encodeURIComponent(payload)));
};

const decrypt = (encrypted: string, password: string): string | null => {
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(encrypted))));
    if (decoded.check !== password.slice(0, 4)) return null;
    return decoded.data;
  } catch {
    return null;
  }
};

export function WalletProvider({ children }: { children: ReactNode }) {
  // State
  const [hasWallet, setHasWallet] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [network, setNetwork] = useState<Network>('mainnet');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [l2, setL2] = useState<L2Data>({
    isConnected: false,
    balanceKray: 0,
    balanceDog: 0,
    balanceDogsocial: 0,
    balanceRadiola: 0,
    transactions: [],
    membership: { tier: 'none', freePerDay: 0, usedToday: 0 },
    pendingWithdrawals: [],
  });

  // Initialize
  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      
      // Initialize API
      await api.initializeAPI();
      
      // Check if wallet exists on SERVER (not local storage)
      // This ensures the same wallet is accessible from any browser/device
      console.log('🔍 Checking for wallet on KRAY OS server...');
      const serverWallet = await api.loadWalletFromServer();
      
      if (serverWallet.exists && serverWallet.data) {
        console.log('✅ Found wallet on server:', serverWallet.data.address?.slice(0, 20) + '...');
        setHasWallet(true);
        
        // Store in local storage for quick access (but server is the source of truth)
        await storage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');
        
        // If we have the encrypted mnemonic, we can set wallet data
        if (serverWallet.data.address) {
          setWallet({
            address: serverWallet.data.address,
            publicKey: serverWallet.data.publicKey || '',
            balance: 0,
            balanceSats: 0,
            unconfirmedBalance: 0,
            utxos: [],
            transactions: [],
            ordinals: [],
            runes: [],
          });
        }
      } else {
        console.log('📭 No wallet found on server');
        setHasWallet(false);
      }
      
      // Get saved network
      const savedNetwork = await storage.getItem(STORAGE_KEYS.NETWORK);
      if (savedNetwork) {
        setNetwork(savedNetwork as Network);
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      // Fallback to local storage if server is unavailable
      const hasWalletStored = await storage.getItem(STORAGE_KEYS.HAS_WALLET);
      setHasWallet(hasWalletStored === 'true');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new wallet
  const createWallet = async (password: string, wordCount: 12 | 24 = 12): Promise<string[]> => {
    setIsLoading(true);
    try {
      const result = await api.generateWallet(wordCount);
      
      // Store encrypted wallet data
      const walletData = {
        mnemonic: result.mnemonic,
        address: result.address,
        publicKey: result.publicKey,
      };
      
      const encrypted = encrypt(JSON.stringify(walletData), password);
      
      // Save to SERVER (primary storage - accessible from any device)
      console.log('💾 Saving wallet to KRAY OS server...');
      await api.saveWalletToServer({
        encryptedMnemonic: encrypted,
        address: result.address,
        publicKey: result.publicKey,
        network: 'mainnet',
      });
      
      // Also save locally for quick unlock (server is source of truth)
      await storage.setItem(STORAGE_KEYS.ENCRYPTED_WALLET, encrypted);
      await storage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');
      
      setHasWallet(true);
      setIsUnlocked(true);
      setMnemonic(result.mnemonic);
      setWallet({
        address: result.address,
        publicKey: result.publicKey,
        balance: 0,
        balanceSats: 0,
        unconfirmedBalance: 0,
        utxos: [],
        transactions: [],
        ordinals: [],
        runes: [],
      });
      
      return result.mnemonic.split(' ');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore wallet from mnemonic
  const restoreWallet = async (mnemonicPhrase: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await api.restoreWallet(mnemonicPhrase);
      
      // Store encrypted wallet data
      const walletData = {
        mnemonic: mnemonicPhrase,
        address: result.address,
        publicKey: result.publicKey,
      };
      
      const encrypted = encrypt(JSON.stringify(walletData), password);
      
      // Save to SERVER (primary storage - accessible from any device)
      console.log('💾 Saving restored wallet to KRAY OS server...');
      await api.saveWalletToServer({
        encryptedMnemonic: encrypted,
        address: result.address,
        publicKey: result.publicKey,
        network: 'mainnet',
      });
      
      // Also save locally for quick unlock (server is source of truth)
      await storage.setItem(STORAGE_KEYS.ENCRYPTED_WALLET, encrypted);
      await storage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');
      
      setHasWallet(true);
      setIsUnlocked(true);
      setMnemonic(mnemonicPhrase);
      setWallet({
        address: result.address,
        publicKey: result.publicKey,
        balance: 0,
        balanceSats: 0,
        unconfirmedBalance: 0,
        utxos: [],
        transactions: [],
        ordinals: [],
        runes: [],
      });
      
      // Load initial data
      await refreshAll();
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock wallet
  const unlockWallet = async (password: string): Promise<boolean> => {
    try {
      // Try to get encrypted data from local storage first (faster)
      let encrypted = await storage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
      
      // If not found locally, try server
      if (!encrypted) {
        console.log('📥 Loading wallet from server for unlock...');
        const serverWallet = await api.loadWalletFromServer();
        if (serverWallet.exists && serverWallet.data?.encryptedMnemonic) {
          encrypted = serverWallet.data.encryptedMnemonic;
          // Cache locally
          await storage.setItem(STORAGE_KEYS.ENCRYPTED_WALLET, encrypted);
        }
      }
      
      if (!encrypted) return false;
      
      const decrypted = decrypt(encrypted, password);
      if (!decrypted) return false;
      
      const walletData = JSON.parse(decrypted);
      
      setMnemonic(walletData.mnemonic);
      setWallet({
        address: walletData.address,
        publicKey: walletData.publicKey,
        balance: 0,
        balanceSats: 0,
        unconfirmedBalance: 0,
        utxos: [],
        transactions: [],
        ordinals: [],
        runes: [],
      });
      setIsUnlocked(true);
      
      // Load data
      setTimeout(() => refreshAll(), 100);
      
      return true;
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      return false;
    }
  };

  // Lock wallet
  const lockWallet = () => {
    setIsUnlocked(false);
    setMnemonic(null);
    // Keep wallet address for display, but clear sensitive data
  };

  // Delete wallet
  const deleteWallet = async () => {
    // Clear from SERVER (primary storage)
    console.log('🗑️ Clearing wallet from KRAY OS server...');
    await api.clearWalletFromServer();
    
    // Also clear local storage
    await storage.deleteItem(STORAGE_KEYS.ENCRYPTED_WALLET);
    await storage.deleteItem(STORAGE_KEYS.HAS_WALLET);
    setHasWallet(false);
    setIsUnlocked(false);
    setMnemonic(null);
    setWallet(null);
  };

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const [balanceData, utxos] = await Promise.all([
        api.getBalance(wallet.address),
        api.getUTXOs(wallet.address),
      ]);
      
      setWallet(prev => prev ? {
        ...prev,
        balanceSats: balanceData.confirmed,
        balance: balanceData.confirmed / 100000000,
        unconfirmedBalance: balanceData.unconfirmed,
        utxos,
      } : null);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [wallet?.address]);

  // Refresh transactions
  const refreshTransactions = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const transactions = await api.getTransactions(wallet.address);
      setWallet(prev => prev ? { ...prev, transactions } : null);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    }
  }, [wallet?.address]);

  // Refresh ordinals
  const refreshOrdinals = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const ordinals = await api.getOrdinals(wallet.address);
      // Only update if we got results, don't overwrite existing data with empty array
      if (ordinals.length > 0) {
        console.log('📝 Updating wallet with', ordinals.length, 'ordinals');
        setWallet(prev => prev ? { ...prev, ordinals } : null);
      } else {
        console.log('⚠️ No ordinals returned, keeping existing data');
      }
    } catch (error) {
      console.error('Error refreshing ordinals:', error);
    }
  }, [wallet?.address]);

  // Refresh runes
  const refreshRunes = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const runes = await api.getRunes(wallet.address);
      // Only update if we got results, don't overwrite existing data with empty array
      if (runes.length > 0) {
        console.log('📝 Updating wallet with', runes.length, 'runes');
        setWallet(prev => prev ? { ...prev, runes } : null);
      } else {
        console.log('⚠️ No runes returned, keeping existing data');
      }
    } catch (error) {
      console.error('Error refreshing runes:', error);
    }
  }, [wallet?.address]);

  // Refresh L2 data
  const refreshL2 = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const [isConnected, balance, transactions, membership, pendingWithdrawals] = await Promise.all([
        api.checkL2Health(),
        api.getL2Balance(wallet.address),
        api.getL2Transactions(wallet.address),
        api.getL2Membership(wallet.address),
        api.getPendingWithdrawals(wallet.address),
      ]);
      
      // Parse balance (API returns string values)
      const balanceKray = parseInt(balance.balance_kray) || parseInt(balance.balance) || 0;
      
      setL2({
        isConnected,
        balanceKray: balanceKray,
        balanceDog: 0, // Not available in current API
        balanceDogsocial: 0,
        balanceRadiola: 0,
        transactions,
        membership: {
          tier: membership.tier,
          freePerDay: membership.limits?.freeTxPerDay || 0,
          usedToday: membership.usage?.dailyUsed || 0,
        },
        pendingWithdrawals,
      });
    } catch (error) {
      console.error('Error refreshing L2:', error);
    }
  }, [wallet?.address]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshBalance(),
      refreshTransactions(),
      refreshOrdinals(),
      refreshRunes(),
      refreshL2(),
    ]);
  }, [refreshBalance, refreshTransactions, refreshOrdinals, refreshRunes, refreshL2]);

  // Switch network
  const switchNetwork = async (newNetwork: Network) => {
    setNetwork(newNetwork);
    await storage.setItem(STORAGE_KEYS.NETWORK, newNetwork);
  };

  // Get mnemonic (requires password verification)
  const getMnemonic = async (password: string): Promise<string | null> => {
    try {
      const encrypted = await storage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
      if (!encrypted) return null;
      
      const decrypted = decrypt(encrypted, password);
      if (!decrypted) return null;
      
      const walletData = JSON.parse(decrypted);
      return walletData.mnemonic;
    } catch {
      return null;
    }
  };

  // Sign message (placeholder - implement with actual signing)
  const signMessage = async (message: string, password: string): Promise<string> => {
    // In production, implement actual message signing
    const mnemonicPhrase = await getMnemonic(password);
    if (!mnemonicPhrase) throw new Error('Invalid password');
    
    // TODO: Implement actual signing
    return 'signed_message_placeholder';
  };

  // ========== SEND FUNCTIONS (MAINNET) ==========

  // Verify password is correct
  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      let encrypted = await storage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
      
      if (!encrypted) {
        const serverWallet = await api.loadWalletFromServer();
        if (serverWallet.exists && serverWallet.data?.encryptedMnemonic) {
          encrypted = serverWallet.data.encryptedMnemonic;
        }
      }
      
      if (!encrypted) return false;
      
      const decrypted = decrypt(encrypted, password);
      return decrypted !== null;
    } catch {
      return false;
    }
  };

  // Get mnemonic from password (internal use)
  const getMnemonicFromPassword = async (password: string): Promise<string | null> => {
    try {
      let encrypted = await storage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
      
      if (!encrypted) {
        const serverWallet = await api.loadWalletFromServer();
        if (serverWallet.exists && serverWallet.data?.encryptedMnemonic) {
          encrypted = serverWallet.data.encryptedMnemonic;
        }
      }
      
      if (!encrypted) return null;
      
      const decrypted = decrypt(encrypted, password);
      if (!decrypted) return null;
      
      const walletData = JSON.parse(decrypted);
      return walletData.mnemonic;
    } catch {
      return null;
    }
  };

  /**
   * Sign a PSBT with optional sighash type
   * @param psbtBase64 - Base64 encoded PSBT
   * @param password - Wallet password
   * @param sighashType - Optional sighash (0x82 for seller listings, 0x01 for buyer)
   * @returns Signed PSBT base64
   */
  const signPsbt = async (
    psbtBase64: string,
    password: string,
    sighashType?: number,
    inputsToSign?: number[]  // Optional: specify which inputs to sign (for atomic swaps)
  ): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    // Verify password and get mnemonic
    const mnemonic = await getMnemonicFromPassword(password);
    if (!mnemonic) {
      throw new Error('Invalid password');
    }
    
    console.log('🔏 Signing PSBT...', { 
      sighashType: sighashType?.toString(16) || 'default',
      inputsToSign: inputsToSign || 'ALL'
    });
    
    try {
      // Call backend to sign PSBT - SAME ENDPOINT AS EXTENSION!
      const signRes = await fetch(`${api.API_URL}/api/kraywallet/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mnemonic,
          psbt: psbtBase64,
          network: 'mainnet',
          sighashType: sighashType, // Optional - backend will use appropriate type
          inputsToSign: inputsToSign, // Optional - specify which inputs to sign
        }),
      });
      
      if (!signRes.ok) {
        const error = await signRes.json().catch(() => ({ error: 'Failed to sign PSBT' }));
        throw new Error(error.error || error.message || 'Failed to sign PSBT');
      }
      
      const signData = await signRes.json();
      console.log('✅ PSBT signed');
      
      return signData.signedPsbt;
    } catch (error: any) {
      console.error('❌ PSBT signing failed:', error);
      throw error;
    }
  };

  // Prepare Bitcoin transaction (returns PSBT details for confirmation UI)
  const prepareBitcoinTx = async (
    toAddress: string,
    amountSats: number,
    feeRate: number
  ): Promise<api.PSBTDetails> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    if (!wallet.utxos || wallet.utxos.length === 0) {
      throw new Error('No UTXOs available');
    }
    
    if (amountSats > wallet.balanceSats) {
      throw new Error('Insufficient balance');
    }
    
    console.log('📝 Preparing transaction:', { toAddress, amountSats, feeRate });
    
    // Create PSBT with full details
    const psbtDetails = await api.createTransaction({
      fromAddress: wallet.address,
      toAddress,
      amount: amountSats,
      feeRate,
      utxos: wallet.utxos,
    });
    
    console.log('✅ PSBT prepared:', psbtDetails);
    return psbtDetails;
  };

  // Send BTC to address (with password verification)
  const sendBitcoin = async (
    toAddress: string, 
    amountSats: number, 
    feeRate: number,
    password: string
  ): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    // Verify password and get mnemonic
    const walletMnemonic = await getMnemonicFromPassword(password);
    if (!walletMnemonic) {
      throw new Error('Invalid password');
    }
    
    if (!wallet.utxos || wallet.utxos.length === 0) {
      throw new Error('No UTXOs available');
    }
    
    if (amountSats > wallet.balanceSats) {
      throw new Error('Insufficient balance');
    }
    
    setIsLoading(true);
    try {
      console.log('📤 Sending transaction:', { toAddress, amountSats, feeRate });
      
      // Send transaction (creates, signs, and broadcasts in one call)
      const { txid } = await api.signAndBroadcast({
        mnemonic: walletMnemonic,
        toAddress,
        amount: amountSats,
        feeRate,
      });
      
      console.log('✅ Transaction broadcast:', txid);
      
      // Refresh balance after sending
      setTimeout(() => refreshBalance(), 2000);
      
      return txid;
    } finally {
      setIsLoading(false);
    }
  };

  // Send Ordinal inscription (with password verification)
  const sendOrdinal = async (inscriptionId: string, toAddress: string, password: string): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    // Verify password and get mnemonic
    const walletMnemonic = await getMnemonicFromPassword(password);
    if (!walletMnemonic) {
      throw new Error('Invalid password');
    }
    
    setIsLoading(true);
    try {
      console.log('📤 ========== SENDING INSCRIPTION ==========');
      console.log('  Inscription ID:', inscriptionId);
      console.log('  To:', toAddress);
      
      // Find the ordinal in wallet
      const ordinal = wallet.ordinals?.find(o => o.id === inscriptionId);
      if (!ordinal) {
        throw new Error('Inscription not found in wallet');
      }
      
      console.log('  Inscription Number:', ordinal.number);
      console.log('  Output:', ordinal.output);
      console.log('  Location:', ordinal.location);
      console.log('  Value:', ordinal.value);
      
      // Convert output/location to UTXO format (same as extension prod)
      // output format: "txid:vout" or location format: "txid:vout:offset"
      let utxoTxid: string;
      let utxoVout: number;
      let utxoValue: number;
      
      if (ordinal.output) {
        const parts = ordinal.output.split(':');
        utxoTxid = parts[0];
        utxoVout = parseInt(parts[1]) || 0;
      } else if (ordinal.location) {
        const parts = ordinal.location.split(':');
        utxoTxid = parts[0];
        utxoVout = parseInt(parts[1]) || 0;
      } else {
        // Fallback: extract from inscription ID (inscriptionId format: txidi0)
        utxoTxid = ordinal.id.split('i')[0];
        utxoVout = parseInt(ordinal.id.split('i')[1]) || 0;
      }
      
      utxoValue = ordinal.value || 600; // Default 600 sats
      
      // Prepare inscription object with UTXO info (same format as extension prod)
      const inscriptionData = {
        id: ordinal.id,
        number: ordinal.number,
        utxo: {
          txid: utxoTxid,
          vout: utxoVout,
          value: utxoValue,
        }
      };
      
      console.log('📦 UTXO:', inscriptionData.utxo);
      
      // Validate UTXO data
      if (!inscriptionData.utxo.txid || inscriptionData.utxo.vout === undefined) {
        throw new Error('Inscription UTXO data is missing. Please refresh inscriptions.');
      }
      
      // Step 1: Create and sign transaction (same as extension prod)
      console.log('📡 Calling backend /api/kraywallet/send-inscription...');
      
      const res = await fetch(`${api.API_URL}/api/kraywallet/send-inscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mnemonic: walletMnemonic,
          inscription: inscriptionData,
          recipientAddress: toAddress,
          feeRate: 2, // Default 2 sat/vB for inscriptions
          network: 'mainnet',
        }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to send inscription' }));
        throw new Error(error.error || error.message || 'Failed to send inscription');
      }
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create inscription transaction');
      }
      
      console.log('✅ Transaction created');
      console.log('  TXID:', data.txid);
      console.log('  Fee:', data.fee, 'sats');
      
      // Step 2: Broadcast transaction using backend endpoint (same as extension prod)
      console.log('📡 Broadcasting transaction via /api/psbt/broadcast...');
      
      const broadcastRes = await fetch(`${api.API_URL}/api/psbt/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hex: data.txHex,
        }),
      });
      
      const broadcastData = await broadcastRes.json();
      
      let txid: string;
      
      if (!broadcastData.success) {
        // Fallback to mempool.space if backend broadcast fails
        console.log('⚠️ Backend broadcast failed, trying mempool.space...');
        const mempoolRes = await fetch('https://mempool.space/api/tx', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: data.txHex,
        });
        
        if (!mempoolRes.ok) {
          const mempoolError = await mempoolRes.text();
          throw new Error(`Broadcast failed: ${broadcastData.error || mempoolError}`);
        }
        
        txid = await mempoolRes.text();
        console.log('✅ Transaction broadcast via mempool.space:', txid);
      } else {
        txid = broadcastData.txid;
        console.log('✅ Transaction broadcast!');
        console.log('  TXID:', txid);
      }
      
      console.log('==========================================');
      
      // Refresh ordinals after sending
      setTimeout(() => refreshOrdinals(), 2000);
      
      return txid;
    } finally {
      setIsLoading(false);
    }
  };

  // Send Rune tokens (with password verification)
  const sendRune = async (runeId: string, toAddress: string, amount: string, password: string): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    // Verify password and get mnemonic
    const walletMnemonic = await getMnemonicFromPassword(password);
    if (!walletMnemonic) {
      throw new Error('Invalid password');
    }
    
    // Find rune in wallet to get details
    const rune = wallet.runes?.find(r => r.id === runeId);
    if (!rune) {
      throw new Error('Rune not found in wallet');
    }
    
    const runeName = rune.name || runeId;
    const divisibility = rune.divisibility || 0;
    const runeUtxos = rune.utxos || [];
    const actualRuneId = rune.runeId || rune.id;
    
    // Validate UTXOs exist (required by backend)
    if (runeUtxos.length === 0) {
      throw new Error('No UTXOs found for this rune. Please refresh your runes.');
    }
    
    setIsLoading(true);
    try {
      console.log('📤 Sending rune:', runeName, 'amount:', amount, 'to:', toAddress);
      console.log('📦 Rune details:', { id: runeId, runeId: actualRuneId, divisibility, balance: rune.balance });
      console.log('📦 Rune UTXOs:', runeUtxos.length, 'UTXOs available');
      
      // Step 1: Build PSBT
      console.log('🔧 Building PSBT...');
      const buildRes = await fetch(`${api.API_URL}/api/runes/build-send-psbt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: wallet.address,
          toAddress,
          runeName,
          runeId: actualRuneId,
          amount,
          divisibility,
          feeRate: 2, // Default 2 sat/vB
          // ✅ CRITICAL: Include UTXOs required by backend!
          runeUtxos,
        }),
      });
      
      if (!buildRes.ok) {
        const error = await buildRes.json().catch(() => ({ error: 'Failed to build PSBT' }));
        throw new Error(error.error || error.message || 'Failed to build PSBT');
      }
      
      const buildData = await buildRes.json();
      console.log('✅ PSBT built, fee:', buildData.fee);
      
      // Step 2: Sign PSBT
      console.log('🔏 Signing PSBT...');
      const signRes = await fetch(`${api.API_URL}/api/kraywallet/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mnemonic: walletMnemonic,
          psbt: buildData.psbt,
        }),
      });
      
      if (!signRes.ok) {
        const error = await signRes.json().catch(() => ({ error: 'Failed to sign PSBT' }));
        throw new Error(error.error || error.message || 'Failed to sign PSBT');
      }
      
      const signData = await signRes.json();
      console.log('✅ PSBT signed');
      
      // Step 3: Finalize PSBT
      console.log('🔨 Finalizing PSBT...');
      const finalizeRes = await fetch(`${api.API_URL}/api/kraywallet/finalize-psbt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psbt: signData.signedPsbt,
        }),
      });
      
      if (!finalizeRes.ok) {
        const error = await finalizeRes.json().catch(() => ({ error: 'Failed to finalize PSBT' }));
        throw new Error(error.error || error.message || 'Failed to finalize PSBT');
      }
      
      const finalizeData = await finalizeRes.json();
      console.log('✅ PSBT finalized, txid:', finalizeData.txid);
      
      // Step 4: Broadcast
      console.log('📡 Broadcasting transaction...');
      const broadcastRes = await fetch('https://mempool.space/api/tx', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: finalizeData.hex,
      });
      
      if (!broadcastRes.ok) {
        const broadcastError = await broadcastRes.text();
        throw new Error(`Broadcast failed: ${broadcastError}`);
      }
      
      const txid = await broadcastRes.text();
      console.log('✅ Rune sent:', txid);
      
      // ⚠️ DON'T auto-refresh runes immediately!
      // This causes a re-render that resets the success screen state (successTxid)
      // The user won't see the success screen if we refresh here.
      // Let the user manually refresh after viewing the success screen.
      // setTimeout(() => refreshRunes(), 2000);  // DISABLED - causes success screen to disappear!
      
      return txid;
    } finally {
      setIsLoading(false);
    }
  };

  // ========== L2 FUNCTIONS ==========

  // Send tokens on L2 (instant)
  const sendL2 = async (toAddress: string, amount: number, token: string, password: string): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    if (!password) {
      throw new Error('Password required');
    }
    
    setIsLoading(true);
    try {
      console.log('⚡ L2 Transfer:', amount, token, 'to:', toAddress);
      
      // Get mnemonic from password
      const mnemonic = await getMnemonicFromPassword(password);
      if (!mnemonic) {
        throw new Error('Invalid password');
      }
      
      // Get current nonce
      const nonce = await api.getL2Nonce(wallet.address);
      console.log('   Nonce:', nonce);
      
      // Create message to sign (same format as extension)
      const message = [
        wallet.address,
        toAddress,
        amount.toString(),
        nonce.toString(),
        'transfer'
      ].join(':');
      
      console.log('   Message to sign:', message.substring(0, 50) + '...');
      
      // Sign the message using backend
      const signRes = await fetch(`${api.API_URL}/api/kraywallet/sign-l2-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mnemonic, message }),
      });
      
      if (!signRes.ok) {
        const err = await signRes.json();
        throw new Error(err.error || 'Failed to sign message');
      }
      
      const signData = await signRes.json();
      console.log('   Signature:', signData.signature?.substring(0, 20) + '...');
      
      // Send transfer with signature
      const result = await api.l2Transfer({
        fromAddress: wallet.address,
        toAddress,
        amount,
        token,
        signature: signData.signature,
        pubkey: signData.pubkey,
        nonce,
      });
      
      console.log('✅ L2 Transfer complete:', result.tx_hash);
      
      // Refresh L2 balance
      setTimeout(() => refreshL2(), 1000);
      
      return result.tx_hash;
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw from L2 to mainnet - FULL PSBT FLOW (igual Extension)
  const withdrawL2 = async (params: {
    amount: number;
    password: string;
    feeRate: number;
    feeUtxo: api.FeeUtxo;
    l2Fee: number;
  }): Promise<string> => {
    const { amount, password, feeRate, feeUtxo, l2Fee } = params;
    
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    if (amount > l2.balanceKray) {
      throw new Error('Insufficient L2 balance');
    }
    
    setIsLoading(true);
    try {
      console.log('📤 L2 Withdraw:', amount, 'KRAY');
      console.log('   Fee Rate:', feeRate, 'sat/vB');
      console.log('   Fee UTXO:', feeUtxo.txid + ':' + feeUtxo.vout, '(' + feeUtxo.value + ' sats)');
      console.log('   L2 Fee:', l2Fee, 'KRAY');
      
      // Step 1: Get mnemonic from password
      const mnemonic = await getMnemonic(password);
      if (!mnemonic) {
        throw new Error('Invalid password');
      }
      
      // Step 2: Get current nonce
      const nonce = await api.getL2Nonce(wallet.address);
      console.log('   Nonce:', nonce);
      
      // Step 3: Sign L2 withdrawal message (proves user owns L2 account)
      console.log('   ⏳ Signing L2 message...');
      const { signature, pubkey } = await api.signL2Message({
        mnemonic,
        messageData: {
          from: wallet.address,
          to: '', // Withdrawal has no L2 recipient
          amount: amount,
          nonce: nonce,
          type: 'withdrawal',
        },
      });
      console.log('   ✅ L2 Signature:', signature.substring(0, 20) + '...');
      
      // Step 4: Request PSBT from backend
      console.log('   ⏳ Requesting PSBT...');
      const withdrawResult = await api.requestL2WithdrawWithUtxo({
        account_id: wallet.address,
        amount: amount,
        l1_address: wallet.address, // Always to self
        signature,
        pubkey,
        nonce,
        fee_rate: feeRate,
        fee_utxo: feeUtxo,
        l2_fee: l2Fee,
      });
      
      if (!withdrawResult.partial_psbt || !withdrawResult.withdrawal_id) {
        throw new Error('Failed to create withdrawal PSBT');
      }
      console.log('   ✅ PSBT created:', withdrawResult.withdrawal_id);
      
      // Step 5: Sign PSBT (user's input only)
      console.log('   ⏳ Signing PSBT...');
      const signedPsbt = await api.signWithdrawalPsbt({
        mnemonic,
        psbt_base64: withdrawResult.partial_psbt,
        inputs_to_sign: [0], // Only sign input 0 (user's fee UTXO)
      });
      console.log('   ✅ PSBT signed');
      
      // Step 6: Submit signed PSBT
      console.log('   ⏳ Submitting signed PSBT...');
      const submitResult = await api.submitSignedL2Withdrawal({
        withdrawal_id: withdrawResult.withdrawal_id,
        signed_psbt: signedPsbt,
      });
      
      console.log('✅ Withdrawal submitted!', withdrawResult.withdrawal_id);
      console.log('   Challenge deadline:', submitResult.challenge_deadline);
      
      // Refresh L2 data
      setTimeout(() => refreshL2(), 1000);
      
      return withdrawResult.withdrawal_id;
    } finally {
      setIsLoading(false);
    }
  };

  // Swap tokens on L2
  const swapL2 = async (fromToken: string, toToken: string, amount: number): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }
    
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    setIsLoading(true);
    try {
      console.log('🔄 L2 Swap:', amount, fromToken, '->', toToken);
      
      // Call L2 swap endpoint
      const res = await fetch(`${api.L2_API_URL}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: wallet.address,
          fromToken,
          toToken,
          amount: amount.toString(),
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Swap failed');
      }
      
      const result = await res.json();
      console.log('✅ Swap complete:', result.tx_hash);
      
      // Refresh L2 data
      setTimeout(() => refreshL2(), 1000);
      
      return result.tx_hash;
    } finally {
      setIsLoading(false);
    }
  };

  const value: WalletContextType = {
    hasWallet,
    isUnlocked,
    isLoading,
    wallet,
    network,
    l2,
    createWallet,
    restoreWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    // Transaction preparation
    prepareBitcoinTx,
    verifyPassword,
    signPsbt,
    // Send functions (mainnet)
    sendBitcoin,
    sendOrdinal,
    sendRune,
    // L2 functions
    sendL2,
    withdrawL2,
    swapL2,
    // Data loading
    refreshBalance,
    refreshTransactions,
    refreshOrdinals,
    refreshRunes,
    refreshL2,
    refreshAll,
    switchNetwork,
    getMnemonic,
    signMessage,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

