"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface WalletInfo {
  address: string;
  publicKey: string;
}

interface CrossChainWalletData {
  solana: WalletInfo;
  evm: WalletInfo;
}

export default function CrossChainWallet() {
  const [passcode, setPasscode] = useState('');
  const [wallets, setWallets] = useState<CrossChainWalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [hasExistingWallet, setHasExistingWallet] = useState<boolean | null>(null);

  // Check if user has existing wallet
  const checkExistingWallet = async () => {
    try {
      const response = await fetch('/api/wallet/cross-chain');
      const data = await response.json();
      
      if (data.success) {
        setHasExistingWallet(data.hasCrossChainWallet);
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  };

  // Create new cross-chain wallet
  const createWallet = async () => {
    if (!passcode || passcode.length !== 6) {
      toast.error('Please enter a 6-digit passcode');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/cross-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          passcode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWallets(data.wallets);
        toast.success('Cross-chain wallet created successfully!');
      } else {
        toast.error(data.error || 'Failed to create wallet');
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  // Migrate existing Solana wallet to cross-chain
  const migrateWallet = async () => {
    if (!passcode || passcode.length !== 6) {
      toast.error('Please enter your existing 6-digit passcode');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/cross-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          passcode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWallets(data.wallets);
        toast.success('Wallet migrated to cross-chain successfully!');
      } else {
        toast.error(data.error || 'Failed to migrate wallet');
      }
    } catch (error) {
      console.error('Error migrating wallet:', error);
      toast.error('Failed to migrate wallet');
    } finally {
      setLoading(false);
    }
  };

  // Get existing cross-chain wallet
  const getWallet = async () => {
    if (!passcode || passcode.length !== 6) {
      toast.error('Please enter your 6-digit passcode');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/cross-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get',
          passcode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWallets(data.wallets);
        toast.success('Wallet retrieved successfully!');
      } else {
        toast.error(data.error || 'Failed to retrieve wallet');
      }
    } catch (error) {
      console.error('Error retrieving wallet:', error);
      toast.error('Failed to retrieve wallet');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Initialize
  if (hasExistingWallet === null) {
    checkExistingWallet();
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-emerald-400">Cross-Chain Wallet</h1>
        <p className="text-gray-400">
          One passcode, multiple blockchains. Access your Solana and EVM wallets seamlessly.
        </p>
      </div>

      {/* Passcode Input */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                type={showPasscode ? 'text' : 'password'}
                placeholder="Enter 6-digit passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPasscode(!showPasscode)}
            >
              {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-3">
            {!hasExistingWallet ? (
              <Button
                onClick={createWallet}
                disabled={loading || passcode.length !== 6}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Creating...' : 'Create Cross-Chain Wallet'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={getWallet}
                  disabled={loading || passcode.length !== 6}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Loading...' : 'Access Wallet'}
                </Button>
                <Button
                  onClick={migrateWallet}
                  disabled={loading || passcode.length !== 6}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? 'Migrating...' : 'Upgrade to Cross-Chain'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Wallet Information */}
      {wallets && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Solana Wallet */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Solana Wallet</h3>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  SOL
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Address</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-zinc-800 rounded text-sm break-all">
                      {wallets.solana.address}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(wallets.solana.address, 'Solana address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Public Key</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-zinc-800 rounded text-sm break-all">
                      {wallets.solana.publicKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(wallets.solana.publicKey, 'Solana public key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  Compatible with: Solana, Serum, Raydium, Jupiter
                </p>
              </div>
            </div>
          </Card>

          {/* EVM Wallet */}
          <Card className="p-6 bg-zinc-900 border-zinc-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">EVM Wallet</h3>
                <div className="flex space-x-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    ETH
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    MATIC
                  </Badge>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    BNB
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Address</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-zinc-800 rounded text-sm break-all">
                      {wallets.evm.address}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(wallets.evm.address, 'EVM address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Public Key</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-zinc-800 rounded text-sm break-all">
                      {wallets.evm.publicKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(wallets.evm.publicKey, 'EVM public key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  Compatible with: Ethereum, Polygon, BSC, Arbitrum, Optimism
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Benefits */}
      <Card className="p-6 bg-emerald-900/20 border-emerald-800/50">
        <h3 className="text-lg font-semibold text-emerald-400 mb-3">Cross-Chain Benefits</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-white mb-1">One Passcode</h4>
            <p className="text-gray-400">Single 6-digit passcode for all your wallets</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">Multi-Chain Access</h4>
            <p className="text-gray-400">Seamlessly interact with Solana and EVM chains</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">Enhanced Composability</h4>
            <p className="text-gray-400">Bridge assets and use DeFi across multiple chains</p>
          </div>
        </div>
      </Card>
    </div>
  );
} 