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
  const res = await fetch(`${API_URL}/api/kraywallet/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mnemonic }),
  });
  
  if (!res.ok) throw new Error('Failed to restore wallet');
  return res.json();
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

// Get Ordinals (Inscriptions)
export async function getOrdinals(address: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/api/ordinals/${address}`);
    if (!res.ok) throw new Error('Failed to fetch ordinals');
    return res.json();
  } catch (error) {
    console.error('Error fetching ordinals:', error);
    return [];
  }
}

// Get Runes
export async function getRunes(address: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/api/runes/${address}`);
    if (!res.ok) throw new Error('Failed to fetch runes');
    return res.json();
  } catch (error) {
    console.error('Error fetching runes:', error);
    return [];
  }
}

// Create Transaction
export async function createTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  feeRate: number;
  utxos: any[];
}): Promise<{ psbt: string; fee: number }> {
  const res = await fetch(`${API_URL}/api/kraywallet/create-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) throw new Error('Failed to create transaction');
  return res.json();
}

// Sign and Broadcast Transaction
export async function signAndBroadcast(params: {
  psbt: string;
  mnemonic: string;
}): Promise<{ txid: string }> {
  const res = await fetch(`${API_URL}/api/kraywallet/sign-broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) throw new Error('Failed to sign/broadcast transaction');
  return res.json();
}

// ========== L2 API ==========

// Check L2 Health
export async function checkL2Health(): Promise<boolean> {
  try {
    const res = await fetch(`${L2_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.status === 'healthy';
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Get L2 Balance
export async function getL2Balance(address: string): Promise<{
  balance_kray: number;
  balance_dog?: number;
  balance_dogsocial?: number;
  balance_radiola?: number;
}> {
  try {
    const res = await fetch(`${L2_API_URL}/account/${address}/balance`);
    if (!res.ok) throw new Error('Failed to fetch L2 balance');
    return res.json();
  } catch (error) {
    console.error('Error fetching L2 balance:', error);
    return { balance_kray: 0 };
  }
}

// Get L2 Transactions
export async function getL2Transactions(address: string): Promise<any[]> {
  try {
    const res = await fetch(`${L2_API_URL}/account/${address}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch L2 transactions');
    return res.json();
  } catch (error) {
    console.error('Error fetching L2 transactions:', error);
    return [];
  }
}

// L2 Deposit Request
export async function requestL2Deposit(address: string, amount: number): Promise<{
  depositAddress: string;
  depositId: string;
}> {
  const res = await fetch(`${L2_API_URL}/deposit/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, amount }),
  });
  
  if (!res.ok) throw new Error('Failed to request deposit');
  return res.json();
}

// L2 Withdraw
export async function requestL2Withdraw(params: {
  address: string;
  toAddress: string;
  amount: number;
  signature: string;
}): Promise<{ withdrawId: string }> {
  const res = await fetch(`${L2_API_URL}/withdraw/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) throw new Error('Failed to request withdrawal');
  return res.json();
}

// L2 Transfer
export async function l2Transfer(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  token: string;
  signature: string;
}): Promise<{ txId: string }> {
  const res = await fetch(`${L2_API_URL}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) throw new Error('Failed to transfer');
  return res.json();
}

// L2 Swap
export async function l2Swap(params: {
  address: string;
  fromToken: string;
  toToken: string;
  amount: number;
  signature: string;
}): Promise<{ txId: string; received: number }> {
  const res = await fetch(`${L2_API_URL}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) throw new Error('Failed to swap');
  return res.json();
}

// Get L2 Membership
export async function getL2Membership(address: string): Promise<{
  tier: string;
  freeTransactionsPerDay: number;
  usedToday: number;
}> {
  try {
    const res = await fetch(`${L2_API_URL}/account/${address}/membership`);
    if (!res.ok) throw new Error('Failed to fetch membership');
    return res.json();
  } catch (error) {
    return { tier: 'none', freeTransactionsPerDay: 0, usedToday: 0 };
  }
}

// Get Pending Withdrawals
export async function getPendingWithdrawals(address: string): Promise<any[]> {
  try {
    const res = await fetch(`${L2_API_URL}/withdraw/pending/${address}`);
    if (!res.ok) throw new Error('Failed to fetch pending withdrawals');
    return res.json();
  } catch (error) {
    return [];
  }
}

export { API_URL, L2_API_URL };

