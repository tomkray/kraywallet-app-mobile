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

// Simple encryption (in production, use proper encryption)
const encrypt = (data: string, password: string): string => {
  // In production, use proper AES encryption
  return Buffer.from(JSON.stringify({ data, check: password.slice(0, 4) })).toString('base64');
};

const decrypt = (encrypted: string, password: string): string | null => {
  try {
    const decoded = JSON.parse(Buffer.from(encrypted, 'base64').toString());
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
      
      // Check if wallet exists
      const hasWalletStored = await storage.getItem(STORAGE_KEYS.HAS_WALLET);
      setHasWallet(hasWalletStored === 'true');
      
      // Get saved network
      const savedNetwork = await storage.getItem(STORAGE_KEYS.NETWORK);
      if (savedNetwork) {
        setNetwork(savedNetwork as Network);
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
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
      const encrypted = await storage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
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
      setWallet(prev => prev ? { ...prev, ordinals } : null);
    } catch (error) {
      console.error('Error refreshing ordinals:', error);
    }
  }, [wallet?.address]);

  // Refresh runes
  const refreshRunes = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const runes = await api.getRunes(wallet.address);
      setWallet(prev => prev ? { ...prev, runes } : null);
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
      
      setL2({
        isConnected,
        balanceKray: balance.balance_kray || 0,
        balanceDog: balance.balance_dog || 0,
        balanceDogsocial: balance.balance_dogsocial || 0,
        balanceRadiola: balance.balance_radiola || 0,
        transactions,
        membership: {
          tier: membership.tier,
          freePerDay: membership.freeTransactionsPerDay,
          usedToday: membership.usedToday,
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

