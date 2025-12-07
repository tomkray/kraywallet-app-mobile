# 📱 KrayWallet App Mobile

<p align="center">
  <img src="assets/icon.png" width="120" alt="KrayWallet Logo">
</p>

<p align="center">
  <strong>Self-custodial Bitcoin wallet for iOS, Android, Web & KRAY OS</strong>
</p>

<p align="center">
  Bitcoin wallet with full support for Ordinals inscriptions, Runes tokens, and KRAY L2.
</p>

---

## ✨ Features

### 🔐 Core Wallet
- Self-custodial - **you control your keys**
- BIP39 mnemonic (12/24 words)
- BIP86 Taproot addresses (P2TR)
- Secure encrypted storage
- Biometric authentication (Face ID/Touch ID)

### ₿ Bitcoin Assets
- Send/Receive BTC
- Ordinals inscriptions viewer
- Runes tokens support
- Transaction history
- Real-time balance updates

### ⚡ Advanced Features
- QR code scanner
- KRAY L2 integration
- Multi-network support (Mainnet, L2, Testnet)
- PSBT signing
- Multi-fee selection

---

## 🎨 Design

**KRAY OS Style** - Minimalist black & white theme

| Element | Color |
|---------|-------|
| Background | `#000000` |
| Primary | `#FFFFFF` |
| Secondary | `#666666` |
| Cards | `rgba(255,255,255,0.05)` |
| Borders | `rgba(255,255,255,0.1)` |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI

### Installation

```bash
# Clone repository
git clone https://github.com/tomkray/kraywallet-app-mobile.git
cd kraywallet-app-mobile

# Install dependencies
npm install

# Start development
npm start
```

### Running on Devices

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

---

## 📱 Platforms

| Platform | Status | Version |
|----------|--------|---------|
| iOS | ✅ Ready | iOS 14+ |
| Android | ✅ Ready | API 23+ |
| Web/PWA | ✅ Ready | Modern browsers |
| **KRAY OS** | ✅ **Native** | v1.0+ |

---

## 🏗️ Project Structure

```
kraywallet-app-mobile/
├── assets/
│   ├── icon.png          # App icon (KRAY logo)
│   ├── splash.png        # Splash screen
│   └── adaptive-icon.png # Android adaptive icon
├── src/
│   ├── screens/
│   │   ├── WelcomeScreen.tsx
│   │   ├── CreateWalletScreen.tsx
│   │   ├── RestoreWalletScreen.tsx
│   │   ├── MainWalletScreen.tsx
│   │   ├── SendScreen.tsx
│   │   ├── ReceiveScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── BackupScreen.tsx
│   ├── components/
│   │   └── KrayLogo.tsx
│   ├── context/
│   │   └── WalletContext.tsx
│   ├── services/
│   │   └── api.ts
│   └── utils/
│       └── storage.ts
├── App.tsx
├── app.json
└── package.json
```

---

## 🔒 Security

- **AES-256** encryption for wallet data
- HMAC verification for integrity
- Keys never leave the device
- No cloud backups of private keys
- Keychain (iOS) / Keystore (Android)

---

## 🌐 API

Backend: `https://kraywallet-backend.onrender.com`

| Endpoint | Description |
|----------|-------------|
| `/api/wallet/:address/balance` | Get balance |
| `/api/wallet/utxos/:address` | Get UTXOs |
| `/api/runes/fast/:address` | Get runes |
| `/api/wallet/:address/inscriptions` | Get ordinals |
| `/api/wallet/fees` | Fee rates |

---

## 📦 Build for Production

### iOS (App Store)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Android (Play Store)
```bash
eas build --platform android --profile production
eas submit --platform android
```

### KRAY OS
```bash
npx expo export --platform web
# Deploy to KRAY OS
```

---

## 🗺️ Roadmap

### v2.0 (Current)
- ✅ Full Taproot support
- ✅ Runes & Ordinals
- ✅ KRAY OS integration
- ✅ Black & White theme

### v2.1
- 🔜 Lightning Network
- 🔜 DeFi swaps
- 🔜 Push notifications

### v3.0
- 🔜 Hardware wallet support
- 🔜 Multi-wallet
- 🔜 Advanced L2 features

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  <strong>Made with ❤️ for Bitcoin by Kray Space</strong>
</p>

<p align="center">
  <a href="https://kraywallet.com">kraywallet.com</a> •
  <a href="https://kray.space">kray.space</a>
</p>
