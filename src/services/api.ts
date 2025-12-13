/**
 * KrayWallet API Service
 * Handles all backend communication
 */

const API_URLS = {
  production: 'https://kraywallet-backend.onrender.com',
  local: 'http://localhost:5001',
};

const L2_API_URLS = {
  production: 'https://kraywallet-backend.onrender.com/l2',
  local: 'http://localhost:5002',
};

// KRAY OS Server API (Umbrel node - for wallet persistence)
const KRAY_OS_API = 'http://100.112.128.105:3422';

let API_URL = API_URLS.production;
let L2_API_URL = L2_API_URLS.production;

// Find working API
export async function initializeAPI(): Promise<void> {
  // Try production first
  try {
    const res = await fetch(`${API_URLS.production}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      API_URL = API_URLS.production;
      console.log('✅ Using production API');
      return;
    }
  } catch (e) {
    console.log('⏭️ Production API not available');
  }

  // Fallback to local
  try {
    const res = await fetch(`${API_URLS.local}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      API_URL = API_URLS.local;
      console.log('✅ Using local API');
      return;
    }
  } catch (e) {
    console.log('⏭️ Local API not available');
  }

  // Default to production
  API_URL = API_URLS.production;
}

// Wallet Generation
export async function generateWallet(wordCount: 12 | 24 = 12): Promise<{
  mnemonic: string;
  address: string;
  publicKey: string;
}> {
  const res = await fetch(`${API_URL}/api/kraywallet/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordCount }),
  });
  
  if (!res.ok) throw new Error('Failed to generate wallet');
  return res.json();
}

// Restore Wallet from Mnemonic
export async function restoreWallet(mnemonic: string): Promise<{
  address: string;
  publicKey: string;
}> {
  console.log('🔄 Restoring wallet with mnemonic:', mnemonic.split(' ').length, 'words');
  console.log('🌐 API URL:', API_URL);
  
  const res = await fetch(`${API_URL}/api/kraywallet/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mnemonic }),
  });
  
  console.log('📡 Response status:', res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Restore error:', errorText);
    throw new Error('Failed to restore wallet: ' + errorText);
  }
  
  const data = await res.json();
  console.log('✅ Restore success:', data);
  
  return data;
}

// Get Address Balance
export async function getBalance(address: string): Promise<{
  confirmed: number;
  unconfirmed: number;
  total: number;
}> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}`);
    if (!res.ok) throw new Error('Failed to fetch balance');
    
    const data = await res.json();
    const confirmed = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const unconfirmed = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
    
    return {
      confirmed,
      unconfirmed,
      total: confirmed + unconfirmed,
    };
  } catch (error) {
    console.error('Error fetching balance:', error);
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
}

// Get UTXOs
export async function getUTXOs(address: string): Promise<any[]> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}/utxo`);
    if (!res.ok) throw new Error('Failed to fetch UTXOs');
    return res.json();
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    return [];
  }
}

// Get Transaction History
export async function getTransactions(address: string): Promise<any[]> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}/txs`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// Get Fee Rates
export async function getFeeRates(): Promise<{
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}> {
  try {
    const res = await fetch('https://mempool.space/api/v1/fees/recommended');
    if (!res.ok) throw new Error('Failed to fetch fees');
    return res.json();
  } catch (error) {
    console.error('Error fetching fees:', error);
    return {
      fastestFee: 10,
      halfHourFee: 8,
      hourFee: 5,
      economyFee: 2,
      minimumFee: 1,
    };
  }
}

// QuickNode endpoint
const QUICKNODE_URL = 'https://black-wider-sound.btc.quiknode.pro/e035aecc0a995c24e4ae490ab333bc6f4a2a08c5';

// Xverse API Key
const XVERSE_API_KEY = 'ad3d8d8b-171d-4b11-9fba-5d0a78948531';

// Get Ordinals (Inscriptions) - Using Xverse API (primary) with Hiro fallback
export async function getOrdinals(address: string): Promise<any[]> {
  try {
    console.log('🔍 Fetching ordinals for:', address);
    
    // Primary: Xverse API - reliable and has API key
    const url = `https://api.xverse.app/v1/address/${address}/ordinal-utxo`;
    console.log('📡 Calling Xverse API:', url);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': XVERSE_API_KEY,
      },
    });
    
    console.log('📡 Xverse response status:', res.status);
    
    if (!res.ok) {
      console.error('❌ Xverse API error:', res.status, res.statusText);
      return await getOrdinalsFromHiro(address);
    }
    
    const data = await res.json();
    console.log('📦 Xverse data received, total UTXOs:', data.total);
    
    const utxos = data.results || [];
    
    // Extract inscriptions from UTXOs
    const allInscriptions: any[] = [];
    for (const utxo of utxos) {
      if (utxo.inscriptions && utxo.inscriptions.length > 0) {
        console.log(`📍 UTXO ${utxo.txid}:${utxo.vout} has ${utxo.inscriptions.length} inscriptions`);
        for (const inscription of utxo.inscriptions) {
          allInscriptions.push({
            ...inscription,
            utxoTxid: utxo.txid,
            utxoVout: utxo.vout,
            utxoValue: utxo.value,
          });
        }
      }
    }
    
    console.log('✅ Total Ordinals found from Xverse:', allInscriptions.length);
    
    // Get detailed info for each inscription from Hiro (includes number, content_type, etc)
    const detailedInscriptions = await Promise.all(
      allInscriptions.map(async (inscription: any) => {
        const inscriptionId = inscription.id;
        let number = null;
        let contentType = inscription.content_type || 'image/png';
        
        try {
          // Fetch inscription details from Hiro for number and content_type
          const detailRes = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions/${inscriptionId}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            number = detail.number;
            contentType = detail.content_type || contentType;
            console.log(`📋 Inscription #${number}: ${inscriptionId}`);
          }
        } catch (e) {
          console.log('Could not fetch inscription details:', inscriptionId);
        }
        
        // ordinals.com for reliable content display
        const preview = `https://ordinals.com/preview/${inscriptionId}`;
        const content = `https://ordinals.com/content/${inscriptionId}`;
        
        return {
          id: inscriptionId,
          number: number,
          contentType: contentType,
          contentLength: 0,
          genesisTimestamp: null,
          genesisBlockHeight: null,
          genesisTxId: inscriptionId.split('i')[0],
          location: `${inscription.utxoTxid}:${inscription.utxoVout}:${inscription.offset || 0}`,
          output: `${inscription.utxoTxid}:${inscription.utxoVout}`,
          value: inscription.utxoValue,
          satoshi: null,
          preview: preview,
          content: content,
          thumbnail: content, // Use content URL (actual image) not preview (HTML)
        };
      })
    );
    
    console.log('✅ Formatted inscriptions with details:', detailedInscriptions.length);
    return detailedInscriptions;
  } catch (error) {
    console.error('❌ Error fetching ordinals from Xverse:', error);
    return await getOrdinalsFromHiro(address);
  }
}

// Fallback: Get Ordinals from Hiro API
async function getOrdinalsFromHiro(address: string): Promise<any[]> {
  try {
    console.log('🔄 Trying Hiro API fallback...');
    const res = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=60`);
    if (!res.ok) {
      console.error('❌ Hiro API also failed:', res.status);
      return [];
    }
    
    const data = await res.json();
    console.log('✅ Ordinals found (Hiro):', data.results?.length || 0);
    
    return (data.results || []).map((inscription: any) => {
      const inscriptionId = inscription.id;
      const preview = `https://ordinals.com/preview/${inscriptionId}`;
      const content = `https://ordinals.com/content/${inscriptionId}`;
      
      return {
        id: inscriptionId,
        number: inscription.number,
        contentType: inscription.content_type || 'image/png',
        contentLength: inscription.content_length,
        genesisTimestamp: inscription.genesis_timestamp,
        genesisBlockHeight: inscription.genesis_block_height,
        genesisTxId: inscription.genesis_tx_id,
        location: inscription.location,
        output: inscription.output,
        value: inscription.value,
        satoshi: inscription.sat_ordinal,
        preview: preview,
        content: content,
        thumbnail: content, // Use content URL (actual image) not preview (HTML)
      };
    });
  } catch (error) {
    console.error('❌ Error fetching ordinals from Hiro:', error);
    return [];
  }
}

// Get Runes - Using backend API (QuickNode) for UTXOs
// IMPORTANT: Backend returns utxos needed for send transactions!
export async function getRunes(address: string): Promise<any[]> {
  try {
    console.log('🔍 Fetching runes for:', address);
    
    // Use backend API that returns UTXOs (required for send transactions)
    // This uses QuickNode under the hood
    const res = await fetch(`${API_URL}/api/runes/fast/${address}`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!res.ok) {
      console.error('Backend Runes API failed:', res.status);
      // Fallback to Hiro if backend fails (but won't have UTXOs)
      return await getRunesFallback(address);
    }
    
    const data = await res.json();
    
    if (!data.success || !data.runes) {
      console.log('⚠️ No runes from backend, trying fallback');
      return await getRunesFallback(address);
    }
    
    const runes = data.runes;
    console.log('✅ Runes found from backend:', runes.length);
    
    // Map backend response to our format (includes UTXOs!)
    return runes.map((rune: any) => ({
      id: rune.runeId || rune.name, // Use runeId if available
      name: rune.name,
      symbol: rune.symbol || '◆',
      amount: String(rune.amount),
      balance: rune.amount,
      rawAmount: rune.rawAmount,
      divisibility: rune.divisibility || 0,
      formattedAmount: rune.amount?.toLocaleString(),
      thumbnail: rune.thumbnail || rune.parentPreview || '',
      etching: '',
      // ✅ CRITICAL: Include UTXOs for send transactions!
      utxos: rune.utxos || [],
      runeId: rune.runeId,
    }));
  } catch (error) {
    console.error('Error fetching runes from backend:', error);
    return await getRunesFallback(address);
  }
}

// Fallback: Hiro API (doesn't have UTXOs - send won't work!)
async function getRunesFallback(address: string): Promise<any[]> {
  try {
    console.log('⚠️ Using Hiro fallback (no UTXOs - send may fail)');
    
    const res = await fetch(`https://api.hiro.so/runes/v1/addresses/${address}/balances`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!res.ok) {
      console.error('Hiro Runes API failed:', res.status);
      return [];
    }
    
    const data = await res.json();
    const runesList = data.results || [];
    
    // Filter out zero balance runes
    const activeRunes = runesList.filter((r: any) => parseFloat(r.balance) > 0);
    
    console.log('✅ Runes found (Hiro fallback):', activeRunes.length);
    
    // Fetch full rune info from Hiro for each rune (includes symbol and etching)
    const runesWithDetails = await Promise.all(
      activeRunes.map(async (runeData: any) => {
        const rune = runeData.rune;
        let thumbnail = '';
        let etching = '';
        let symbol = '◆';
        let divisibility = 0;
        
        try {
          // Get detailed rune info from Hiro
          const infoRes = await fetch(`https://api.hiro.so/runes/v1/etchings/${rune.id}`, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (infoRes.ok) {
            const infoData = await infoRes.json();
            symbol = infoData.symbol || '◆';
            divisibility = infoData.divisibility || 0;
            etching = infoData.location?.tx_id || '';
            
            if (etching) {
              // Use ordinals.com for the etching inscription as thumbnail
              thumbnail = `https://ordinals.com/content/${etching}i0`;
            }
          }
        } catch (e) {
          console.log('Could not fetch rune details:', rune.id);
        }
        
        // Parse balance with divisibility
        const balanceStr = runeData.balance || '0';
        const balanceNum = parseFloat(balanceStr);
        
        return {
          id: rune.id,
          name: rune.spaced_name || rune.name,
          symbol: symbol,
          amount: balanceStr,
          balance: balanceNum,
          divisibility: divisibility,
          formattedAmount: balanceNum.toLocaleString(),
          thumbnail: thumbnail,
          etching: etching,
          // ⚠️ No UTXOs from Hiro - send will fail!
          utxos: [],
          runeId: rune.id,
        };
      })
    );
    
    return runesWithDetails;
  } catch (error) {
    console.error('Error fetching runes (fallback):', error);
    return [];
  }
}

// PSBT Details interface
export interface PSBTDetails {
  psbt: string;
  fee: number;
  feeRate: number;
  virtualSize: number;
  inputs: Array<{
    txid: string;
    vout: number;
    value: number;
    address?: string;
  }>;
  outputs: Array<{
    address: string;
    value: number;
  }>;
}

// Create Transaction Preview (calculates fee and returns details for confirmation modal)
// Note: This doesn't call the backend - just prepares the preview
export async function createTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  feeRate: number;
  utxos: any[];
}): Promise<PSBTDetails> {
  // Estimate transaction size for Taproot
  // P2TR input: ~57.5 vbytes, P2TR output: ~43 vbytes, overhead: ~10.5 vbytes
  const numInputs = Math.min(params.utxos.length, 10); // Use up to 10 UTXOs
  const estimatedVsize = Math.ceil(numInputs * 57.5 + 2 * 43 + 10.5);
  const estimatedFee = Math.max(estimatedVsize * params.feeRate, 350); // Min 350 sats
  
  const totalInputs = params.utxos.reduce((sum: number, u: any) => sum + (u.value || 0), 0);
  const change = totalInputs - params.amount - estimatedFee;
  
  console.log('📊 Transaction preview:', {
    inputs: numInputs,
    vsize: estimatedVsize,
    fee: estimatedFee,
    change: change,
  });
  
  return {
    psbt: '', // Will be created by backend on send
    fee: estimatedFee,
    feeRate: params.feeRate,
    virtualSize: estimatedVsize,
    inputs: params.utxos.slice(0, numInputs).map((u: any) => ({
      txid: u.txid,
      vout: u.vout,
      value: u.value,
      address: params.fromAddress,
    })),
    outputs: [
      { address: params.toAddress, value: params.amount },
      ...(change > 546 ? [{ address: params.fromAddress, value: change }] : []),
    ],
  };
}

// Send Bitcoin Transaction - uses /api/kraywallet/send endpoint
// This endpoint creates, signs, and returns the transaction hex
// Flow identical to KrayWallet Extension Prod
export async function signAndBroadcast(params: {
  mnemonic: string;
  toAddress: string;
  amount: number;
  feeRate: number;
}): Promise<{ txid: string; txHex: string; fee: number; change: number }> {
  console.log('📤 Calling /api/kraywallet/send...');
  console.log('  To:', params.toAddress);
  console.log('  Amount:', params.amount, 'sats');
  console.log('  Fee rate:', params.feeRate, 'sat/vB');
  
  // Step 1: Create and sign transaction (same as extension prod)
  const res = await fetch(`${API_URL}/api/kraywallet/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mnemonic: params.mnemonic,
      toAddress: params.toAddress,
      amount: params.amount,
      feeRate: params.feeRate,
      network: 'mainnet',
    }),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create transaction' }));
    throw new Error(error.error || error.message || 'Failed to create transaction');
  }
  
  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to create transaction');
  }
  
  console.log('✅ Transaction created');
  console.log('  TXID:', data.txid);
  console.log('  Fee:', data.fee, 'sats');
  console.log('  Change:', data.change, 'sats');
  
  // Step 2: Broadcast transaction using backend endpoint (same as extension prod)
  console.log('📡 Broadcasting transaction via /api/psbt/broadcast...');
  
  const broadcastRes = await fetch(`${API_URL}/api/psbt/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hex: data.txHex,
    }),
  });
  
  const broadcastData = await broadcastRes.json();
  
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
    
    const mempoolTxid = await mempoolRes.text();
    console.log('✅ Transaction broadcast via mempool.space:', mempoolTxid);
    
    return {
      txid: mempoolTxid,
      txHex: data.txHex,
      fee: data.fee,
      change: data.change,
    };
  }
  
  console.log('✅ Transaction broadcast!');
  console.log('  TXID:', broadcastData.txid);
  
  return {
    txid: broadcastData.txid,
    txHex: data.txHex,
    fee: data.fee,
    change: data.change,
  };
}

// ========== L2 API ==========
// Using official KrayWallet backend endpoints

// L2 Health Info (includes bridge address)
export interface L2HealthInfo {
  status: string;
  network: string;
  version: string;
  bridge_address: string;
  withdrawal_processor: {
    active: boolean;
    challenge_period_hours: number;
  };
  solvency: {
    solvent: boolean;
    status: string;
  };
}

let cachedL2Health: L2HealthInfo | null = null;

// Get L2 Health/Config (includes bridge address for deposits)
export async function getL2Health(): Promise<L2HealthInfo | null> {
  try {
    const res = await fetch(`${L2_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      cachedL2Health = await res.json();
      console.log('✅ L2 Health:', cachedL2Health?.status);
      return cachedL2Health;
    }
    return null;
  } catch (error) {
    console.error('Error fetching L2 health:', error);
    return null;
  }
}

// Check L2 Health
export async function checkL2Health(): Promise<boolean> {
  const health = await getL2Health();
  return health?.status === 'healthy';
}

// Get Bridge Deposit Address
export async function getBridgeDepositAddress(): Promise<string> {
  if (cachedL2Health?.bridge_address) {
    return cachedL2Health.bridge_address;
  }
  const health = await getL2Health();
  return health?.bridge_address || 'bc1pxtt3tzrcp4zxy5z43vzhwac47dc6tl4s6l0gfdyuzvx66ljr3x7srwetnd';
}

// Get L2 Balance
export async function getL2Balance(address: string): Promise<{
  balance: string;
  balance_kray: string;
  staked: string;
  available: string;
  nonce: number;
}> {
  try {
    const res = await fetch(`${L2_API_URL}/account/${address}/balance`);
    if (!res.ok) throw new Error('Failed to fetch L2 balance');
    const data = await res.json();
    console.log('✅ L2 Balance:', data);
    return data;
  } catch (error) {
    console.error('Error fetching L2 balance:', error);
    return { balance: '0', balance_kray: '0', staked: '0', available: '0', nonce: 0 };
  }
}

// Get L2 Transactions
export async function getL2Transactions(address: string): Promise<any[]> {
  try {
    const res = await fetch(`${L2_API_URL}/account/${address}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch L2 transactions');
    const data = await res.json();
    console.log('✅ L2 Transactions:', data.transactions?.length || 0);
    return data.transactions || [];
  } catch (error) {
    console.error('Error fetching L2 transactions:', error);
    return [];
  }
}

// Get L2 Membership
export async function getL2Membership(address: string): Promise<{
  tier: string;
  name: string;
  emoji: string;
  color: string;
  limits: {
    freeTxPerDay: number;
    maxTxPerHour: number;
    minBalanceToSend: number;
  };
  usage: {
    dailyUsed: number;
    dailyRemaining: number;
  };
}> {
  try {
    const res = await fetch(`${L2_API_URL}/account/${address}/membership`);
    if (!res.ok) throw new Error('Failed to fetch membership');
    const data = await res.json();
    console.log('✅ L2 Membership:', data.membership?.tier);
    return {
      tier: data.membership?.tier || 'none',
      name: data.membership?.name || 'No Membership',
      emoji: data.membership?.emoji || '👤',
      color: data.membership?.color || '#444444',
      limits: data.limits || { freeTxPerDay: 0, maxTxPerHour: 10, minBalanceToSend: 10 },
      usage: data.usage || { dailyUsed: 0, dailyRemaining: 0 },
    };
  } catch (error) {
    console.error('Error fetching membership:', error);
    return {
      tier: 'none',
      name: 'No Membership',
      emoji: '👤',
      color: '#444444',
      limits: { freeTxPerDay: 0, maxTxPerHour: 10, minBalanceToSend: 10 },
      usage: { dailyUsed: 0, dailyRemaining: 0 },
    };
  }
}

// L2 Transfer (POST to backend)
export async function l2Transfer(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  token: string;
}): Promise<{ tx_hash: string; success: boolean }> {
  const res = await fetch(`${L2_API_URL}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: params.fromAddress,
      to: params.toAddress,
      amount: params.amount.toString(),
      token: params.token,
    }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to transfer');
  }
  return res.json();
}

// L2 Withdraw (POST to backend)
export async function requestL2Withdraw(params: {
  address: string;
  amount: number;
}): Promise<{ success: boolean; message?: string }> {
  // Withdrawals go back to the same address (bridge requirement)
  const res = await fetch(`${L2_API_URL}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: params.address,
      to: params.address, // Same address - bridge requirement
      amount: params.amount.toString(),
    }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to request withdrawal');
  }
  return res.json();
}

// Get Pending Withdrawals
export async function getPendingWithdrawals(address: string): Promise<any[]> {
  try {
    // Correct endpoint for pending withdrawals
    const res = await fetch(`${L2_API_URL}/bridge/withdrawals/${address}/pending`);
    if (!res.ok) {
      // Silently handle 404 - endpoint may not have data
      return [];
    }
    const data = await res.json();
    console.log('✅ Pending withdrawals:', data.withdrawals?.length || 0);
    return data.withdrawals || [];
  } catch (error) {
    // Silently handle errors - not critical
    return [];
  }
}

// ========== SERVER WALLET PERSISTENCE (KRAY OS / Umbrel) ==========
// Wallet is stored on the server, not in browser localStorage
// This ensures the same wallet is accessible from any device

/**
 * Load wallet data from KRAY OS server
 */
export async function loadWalletFromServer(): Promise<{
  exists: boolean;
  data: {
    encryptedMnemonic?: string;
    address?: string;
    publicKey?: string;
    network?: string;
  } | null;
}> {
  try {
    console.log('📥 Loading wallet from server...');
    const res = await fetch(`${KRAY_OS_API}/api/wallet/load`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      console.error('❌ Server error loading wallet');
      return { exists: false, data: null };
    }
    
    const result = await res.json();
    console.log('✅ Wallet load result:', result.exists ? 'Found' : 'Not found');
    
    return {
      exists: result.exists,
      data: result.data,
    };
  } catch (error) {
    console.error('❌ Error loading wallet from server:', error);
    return { exists: false, data: null };
  }
}

/**
 * Save wallet data to KRAY OS server
 */
export async function saveWalletToServer(data: {
  encryptedMnemonic: string;
  address: string;
  publicKey: string;
  network?: string;
}): Promise<boolean> {
  try {
    console.log('💾 Saving wallet to server...');
    const res = await fetch(`${KRAY_OS_API}/api/wallet/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      console.error('❌ Server error saving wallet');
      return false;
    }
    
    console.log('✅ Wallet saved to server');
    return true;
  } catch (error) {
    console.error('❌ Error saving wallet to server:', error);
    return false;
  }
}

/**
 * Clear wallet data from KRAY OS server
 */
export async function clearWalletFromServer(): Promise<boolean> {
  try {
    console.log('🗑️ Clearing wallet from server...');
    const res = await fetch(`${KRAY_OS_API}/api/wallet/clear`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      console.error('❌ Server error clearing wallet');
      return false;
    }
    
    console.log('✅ Wallet cleared from server');
    return true;
  } catch (error) {
    console.error('❌ Error clearing wallet from server:', error);
    return false;
  }
}

/**
 * Check if wallet exists on server
 */
export async function checkWalletOnServer(): Promise<{
  exists: boolean;
  address: string | null;
}> {
  try {
    const res = await fetch(`${KRAY_OS_API}/api/wallet/exists`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      return { exists: false, address: null };
    }
    
    const result = await res.json();
    return {
      exists: result.exists,
      address: result.address,
    };
  } catch (error) {
    console.error('Error checking wallet on server:', error);
    return { exists: false, address: null };
  }
}

// ========== ATOMIC SWAP / BUY NOW API (Same as Extension Prod) ==========
// Endpoints: /api/atomic-swap/...

export interface BuyNowListing {
  order_id: string;
  inscription_id: string;
  seller_address: string;
  price_sats: number;
  status: 'OPEN' | 'PENDING' | 'SOLD' | 'CANCELLED';
  created_at: string;
  description?: string;
}

export interface AtomicSwapListing {
  id: string;
  inscription_id: string;
  seller_address: string;
  price_sats: number;
  status: string;
  psbt_base64?: string;
}

// Get All Atomic Swap Listings (same as extension prod)
export async function getAtomicSwapListings(sellerAddress?: string): Promise<AtomicSwapListing[]> {
  try {
    const url = sellerAddress 
      ? `${API_URL}/api/atomic-swap/?seller_address=${sellerAddress}`
      : `${API_URL}/api/atomic-swap/`;
    
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Object.values(data.listings || {});
  } catch (error) {
    console.error('Error fetching atomic swap listings:', error);
    return [];
  }
}

// Get Buy Now Listings (same as extension prod)
export async function getBuyNowListings(inscriptionId?: string): Promise<BuyNowListing[]> {
  try {
    // Correct endpoint: /api/atomic-swap/ (not /buy-now)
    const url = inscriptionId
      ? `${API_URL}/api/atomic-swap/?inscription_id=${inscriptionId}`
      : `${API_URL}/api/atomic-swap/`;
    
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.listings || [];
  } catch (error) {
    console.error('Error fetching buy now listings:', error);
    return [];
  }
}

// Get Single Buy Now Listing
export async function getBuyNowListing(orderId: string): Promise<BuyNowListing | null> {
  try {
    const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/${orderId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.listing || null;
  } catch (error) {
    console.error('Error fetching buy now listing:', error);
    return null;
  }
}

// Create Buy Now Listing (same as extension prod)
// Step 1: Create listing, get PSBT to sign
// Step 2: Confirm with signed PSBT
export async function createBuyNowListing(params: {
  inscription_id: string;
  price_sats: number;
  seller_address: string;
  description?: string;
  order_id?: string; // For step 2
  seller_signed_psbt?: string; // For step 2
}): Promise<{ 
  success: boolean; 
  order_id?: string; 
  psbt_base64?: string;
  status?: string;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create listing' };
  }
  
  return {
    success: true,
    order_id: data.order_id,
    psbt_base64: data.psbt_base64,
    status: data.status,
  };
}

// Buy Now - Purchase (same as extension prod)
export async function buyNowPurchase(params: {
  orderId: string;
  buyerAddress: string;
  feeRate?: number;
}): Promise<{ 
  success: boolean; 
  psbt_base64?: string;
  required_sats?: number;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/${params.orderId}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyer_address: params.buyerAddress,
      fee_rate: params.feeRate || 5,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create purchase PSBT' };
  }
  
  return {
    success: true,
    psbt_base64: data.psbt_base64,
    required_sats: data.required_sats,
  };
}

// Confirm Buy Now Purchase (broadcasts the transaction)
export async function confirmBuyNowPurchase(params: {
  orderId: string;
  buyerSignedPsbt: string;
}): Promise<{ success: boolean; txid?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/${params.orderId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyer_signed_psbt: params.buyerSignedPsbt,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to confirm purchase' };
  }
  
  return { success: true, txid: data.txid };
}

// Accept Buy Now (for seller to accept incoming purchase)
export async function acceptBuyNowPurchase(params: {
  orderId: string;
  sellerSignedPsbt: string;
}): Promise<{ success: boolean; txid?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/${params.orderId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_signed_psbt: params.sellerSignedPsbt,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to accept purchase' };
  }
  
  return { success: true, txid: data.txid };
}

// Cancel Buy Now Listing (same as extension prod)
export async function cancelBuyNowListing(params: {
  orderId: string;
  sellerAddress: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/${params.orderId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_address: params.sellerAddress,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to cancel listing' };
  }
  
  return { success: true };
}

// Update Buy Now Price (same as extension prod)
export async function updateBuyNowPrice(params: {
  orderId: string;
  newPrice: number;
  sellerAddress: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/buy-now/${params.orderId}/price`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      new_price: params.newPrice,
      seller_address: params.sellerAddress,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to update price' };
  }
  
  return { success: true };
}

// ========== LEGACY ATOMIC SWAP (Offer-based model) ==========

// Create Atomic Swap Offer (legacy - offer model)
export async function createAtomicSwapOffer(params: {
  inscriptionId: string;
  sellerAddress: string;
  priceSats: number;
}): Promise<{ success: boolean; order_id?: string; psbt_base64?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inscription_id: params.inscriptionId,
      seller_address: params.sellerAddress,
      price_sats: params.priceSats,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create offer' };
  }
  
  return { success: true, order_id: data.order_id, psbt_base64: data.psbt_base64 };
}

// Buy Atomic Swap (legacy - prepare purchase)
export async function buyAtomicSwap(params: {
  orderId: string;
  buyerAddress: string;
  feeRate?: number;
}): Promise<{ success: boolean; psbt_base64?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/${params.orderId}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyer_address: params.buyerAddress,
      fee_rate: params.feeRate || 5,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to prepare purchase' };
  }
  
  return { success: true, psbt_base64: data.psbt_base64 };
}

// Sign Atomic Swap PSBT
export async function signAtomicSwapPsbt(params: {
  orderId: string;
  signedPsbt: string;
}): Promise<{ success: boolean; signed_psbt?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/${params.orderId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signed_psbt: params.signedPsbt,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to sign PSBT' };
  }
  
  return { success: true, signed_psbt: data.signed_psbt };
}

// Broadcast Atomic Swap
export async function broadcastAtomicSwap(params: {
  orderId: string;
  signedPsbt: string;
}): Promise<{ success: boolean; txid?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/${params.orderId}/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signed_psbt: params.signedPsbt,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to broadcast' };
  }
  
  return { success: true, txid: data.txid };
}

// Cancel Atomic Swap (legacy)
export async function cancelAtomicSwap(params: {
  orderId: string;
  sellerAddress: string;
  signature: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/atomic-swap/${params.orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_address: params.sellerAddress,
      signature: params.signature,
    }),
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to cancel' };
  }
  
  return { success: true };
}

// ========== RUNES ATOMIC SWAP API (/api/runes-atomic-swap) ==========
// Same endpoints as extension's runes-market.html

export interface RunesListing {
  order_id: string;
  rune_id: string;
  rune_name: string;
  rune_symbol?: string;
  sell_amount: string;
  total_amount: string;
  divisibility: number;
  price_sats: number;
  seller_txid: string;
  seller_vout: number;
  seller_value: number;
  seller_script_pubkey: string;
  seller_payout_address: string;
  seller_signature?: string;
  status: 'OPEN' | 'PENDING' | 'SOLD' | 'CANCELLED';
  created_at: string;
  // Parent inscription thumbnail
  thumbnail?: string;
  parent?: string;
}

// Cache for rune thumbnails (runeId -> thumbnail URL)
const runeThumbnailCache: Map<string, string> = new Map();

// Get Rune Parent Thumbnail
async function getRuneParentThumbnail(runeId: string): Promise<string | null> {
  // Check cache first
  if (runeThumbnailCache.has(runeId)) {
    return runeThumbnailCache.get(runeId) || null;
  }
  
  try {
    // Fetch from Hiro API
    const res = await fetch(`https://api.hiro.so/runes/v1/etchings/${runeId}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (res.ok) {
      const data = await res.json();
      // Check if has a parent inscription from etching
      const etchingTxId = data.location?.tx_id;
      if (etchingTxId) {
        const thumbnail = `https://ordinals.com/content/${etchingTxId}i0`;
        runeThumbnailCache.set(runeId, thumbnail);
        return thumbnail;
      }
    }
  } catch (e) {
    console.log('Could not fetch rune parent:', runeId);
  }
  
  return null;
}

// Get All Runes Listings
export async function getRunesListings(limit: number = 50): Promise<RunesListing[]> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/?limit=${limit}`);
    if (!res.ok) {
      console.error('Failed to fetch runes listings');
      return [];
    }
    const data = await res.json();
    const listings: RunesListing[] = data.listings || [];
    
    // Enrich listings with parent thumbnails
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        // If listing already has thumbnail, use it
        if (listing.thumbnail) return listing;
        
        // Otherwise try to fetch parent thumbnail
        const thumbnail = await getRuneParentThumbnail(listing.rune_id);
        return {
          ...listing,
          thumbnail: thumbnail || undefined,
        };
      })
    );
    
    return enrichedListings;
  } catch (error) {
    console.error('Error fetching runes listings:', error);
    return [];
  }
}

// Get Single Runes Listing
export async function getRunesListing(orderId: string): Promise<RunesListing | null> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/${orderId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.listing || null;
  } catch (error) {
    console.error('Error fetching runes listing:', error);
    return null;
  }
}

// Create Runes Listing (Step 1: Create listing, get PSBT to sign)
export async function createRunesListing(params: {
  runeId: string;
  runeName: string;
  runeSymbol?: string;
  sellAmount: string;
  totalAmount: string;
  divisibility: number;
  sellerTxid: string;
  sellerVout: number;
  sellerValue: number;
  sellerScriptPubKey: string;
  priceSats: number;
  sellerPayoutAddress: string;
}): Promise<{ success: boolean; order_id?: string; psbt_base64?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rune_id: params.runeId,
        rune_name: params.runeName,
        rune_symbol: params.runeSymbol,
        sell_amount: params.sellAmount,
        total_amount: params.totalAmount,
        divisibility: params.divisibility,
        seller_txid: params.sellerTxid,
        seller_vout: params.sellerVout,
        seller_value: params.sellerValue,
        seller_script_pubkey: params.sellerScriptPubKey,
        price_sats: params.priceSats,
        seller_payout_address: params.sellerPayoutAddress,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create listing' };
    }
    
    return { 
      success: true, 
      order_id: data.order_id,
      psbt_base64: data.psbt_base64,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Sign Runes Listing (Step 2: Submit seller signature with SIGHASH_SINGLE|ANYONECANPAY)
export async function signRunesListing(params: {
  orderId: string;
  signedPsbtBase64: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/${params.orderId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signed_psbt_base64: params.signedPsbtBase64,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to sign listing' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Prepare Runes Purchase (Step 1: Get PSBT to sign as buyer)
export async function buyRunesPrepare(params: {
  orderId: string;
  buyerAddress: string;
  buyerUtxos: Array<{ txid: string; vout: number; value: number; scriptPubKey?: string }>;
  feeRate: number;
}): Promise<{ 
  success: boolean; 
  psbt_base64?: string; 
  inputs_to_sign?: number[];
  required_sats?: number;
  error?: string 
}> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/${params.orderId}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_address: params.buyerAddress,
        buyer_utxos: params.buyerUtxos,
        fee_rate: params.feeRate,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to prepare purchase' };
    }
    
    return {
      success: true,
      psbt_base64: data.psbt_base64,
      inputs_to_sign: data.inputs_to_sign || [],
      required_sats: data.required_sats,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Broadcast Runes Purchase (Step 2: Submit signed PSBT)
export async function buyRunesBroadcast(params: {
  orderId: string;
  signedPsbt: string;
  buyerAddress: string;
}): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/${params.orderId}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signed_psbt_base64: params.signedPsbt,
        buyer_address: params.buyerAddress,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to broadcast' };
    }
    
    return { success: true, txid: data.txid };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Cancel Runes Listing
export async function cancelRunesListing(params: {
  orderId: string;
  sellerAddress: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/${params.orderId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_address: params.sellerAddress,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to cancel listing' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Get Runes Market Stats
export async function getRunesMarketStats(): Promise<{
  totalListings: number;
  totalVolume: number;
  totalSales: number;
} | null> {
  try {
    const res = await fetch(`${API_URL}/api/runes-atomic-swap/stats`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      totalListings: data.total_listings || 0,
      totalVolume: data.total_volume || 0,
      totalSales: data.total_sales || 0,
    };
  } catch (error) {
    console.error('Error fetching runes market stats:', error);
    return null;
  }
}

// ========== HELPER FUNCTIONS ==========

// Calculate L2 withdrawal fee in sats based on fee rate
// L2 withdrawals require an on-chain transaction (~150 vbytes)
export function calculateWithdrawalFeeSats(feeRate: number): number {
  const WITHDRAWAL_TX_VBYTES = 150; // Approximate vbytes for withdrawal tx
  return Math.ceil(WITHDRAWAL_TX_VBYTES * feeRate);
}

// Get My Atomic Swap Listings (seller)
export async function getMyAtomicSwaps(address: string): Promise<AtomicSwapListing[]> {
  return getAtomicSwapListings(address);
}

// Get Available Atomic Swap Listings (all open)
export async function getAvailableAtomicSwaps(): Promise<AtomicSwapListing[]> {
  return getAtomicSwapListings();
}

// Get Market Listings (alias for buy now)
export async function getMarketListings(): Promise<BuyNowListing[]> {
  return getBuyNowListings();
}

// Get My Market Listings (alias)
export async function getMyMarketListings(address: string): Promise<BuyNowListing[]> {
  const allListings = await getBuyNowListings();
  return allListings.filter(l => l.seller_address === address);
}

export { API_URL, L2_API_URL, KRAY_OS_API };

