/**
 * KrayWallet Mobile App
 * Bitcoin-native wallet for iOS/Android
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WalletProvider, useWallet } from './src/context/WalletContext';

// Screens
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { CreateWalletScreen } from './src/screens/CreateWalletScreen';
import { BackupScreen } from './src/screens/BackupScreen';
import { RestoreWalletScreen } from './src/screens/RestoreWalletScreen';
import { UnlockScreen } from './src/screens/UnlockScreen';
import { MainWalletScreen } from './src/screens/MainWalletScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SendScreen } from './src/screens/SendScreen';
import { ReceiveScreen } from './src/screens/ReceiveScreen';
import { AtomicSwapScreen } from './src/screens/AtomicSwapScreen';
import { MarketScreen } from './src/screens/MarketScreen';

// Screen types
type Screen = 
  | 'loading'
  | 'welcome'
  | 'create'
  | 'backup'
  | 'restore'
  | 'unlock'
  | 'main'
  | 'settings'
  | 'send'
  | 'receive'
  | 'atomic-swap'
  | 'market';

function AppContent() {
  const { hasWallet, isUnlocked, isLoading } = useWallet();
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [backupMnemonic, setBackupMnemonic] = useState<string[]>([]);

  // Handle initial navigation based on wallet state
  useEffect(() => {
    if (isLoading) {
      setCurrentScreen('loading');
    } else if (!hasWallet) {
      setCurrentScreen('welcome');
    } else if (!isUnlocked) {
      setCurrentScreen('unlock');
    } else {
      setCurrentScreen('main');
    }
  }, [hasWallet, isUnlocked, isLoading]);

  // Render loading screen
  if (currentScreen === 'loading') {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7931a" />
      </LinearGradient>
    );
  }

  // Render screens based on navigation state
  switch (currentScreen) {
    case 'welcome':
      return (
        <WelcomeScreen
          onCreateWallet={() => setCurrentScreen('create')}
          onRestoreWallet={() => setCurrentScreen('restore')}
        />
      );

    case 'create':
      return (
        <CreateWalletScreen
          onBack={() => setCurrentScreen('welcome')}
          onSuccess={(mnemonic) => {
            setBackupMnemonic(mnemonic);
            setCurrentScreen('backup');
          }}
        />
      );

    case 'backup':
      return (
        <BackupScreen
          mnemonic={backupMnemonic}
          onContinue={() => {
            setBackupMnemonic([]);
            setCurrentScreen('main');
          }}
        />
      );

    case 'restore':
      return (
        <RestoreWalletScreen
          onBack={() => setCurrentScreen('welcome')}
          onSuccess={() => setCurrentScreen('main')}
        />
      );

    case 'unlock':
      return (
        <UnlockScreen
          onUnlock={() => setCurrentScreen('main')}
          onRestore={() => setCurrentScreen('restore')}
        />
      );

    case 'main':
      return (
        <MainWalletScreen
          onSettings={() => setCurrentScreen('settings')}
          onSend={() => setCurrentScreen('send')}
          onReceive={() => setCurrentScreen('receive')}
          onAtomicSwap={() => setCurrentScreen('atomic-swap')}
          onMarket={() => setCurrentScreen('market')}
        />
      );

    case 'settings':
      return (
        <SettingsScreen
          onBack={() => setCurrentScreen('main')}
          onLogout={() => setCurrentScreen('unlock')}
        />
      );

    case 'send':
      return (
        <SendScreen
          onBack={() => setCurrentScreen('main')}
          onSuccess={(txid) => {
            console.log('Transaction sent:', txid);
            setCurrentScreen('main');
          }}
        />
      );

    case 'receive':
      return (
        <ReceiveScreen
          onBack={() => setCurrentScreen('main')}
        />
      );

    case 'atomic-swap':
      return (
        <AtomicSwapScreen
          onBack={() => setCurrentScreen('main')}
        />
      );

    case 'market':
      return (
        <MarketScreen
          onBack={() => setCurrentScreen('main')}
        />
      );

    default:
      return (
        <WelcomeScreen
          onCreateWallet={() => setCurrentScreen('create')}
          onRestoreWallet={() => setCurrentScreen('restore')}
        />
      );
  }
}

export default function App() {
  return (
    <WalletProvider>
      <StatusBar style="light" />
      <AppContent />
    </WalletProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
