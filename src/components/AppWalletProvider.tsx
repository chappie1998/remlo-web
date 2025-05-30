"use client";

import React, { FC, useMemo } from 'react';
import {
    ConnectionProvider,
    WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import specific wallet adapters if you want to manually add them,
// otherwise, WalletProvider can auto-detect standard wallets.
// Example: import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

interface AppWalletProviderProps {
    children: React.ReactNode;
}

const AppWalletProvider: FC<AppWalletProviderProps> = ({ children }) => {
    // You can also use a custom RPC endpoint
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const networkString = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    let network: WalletAdapterNetwork;

    if (networkString === 'mainnet-beta' || networkString === 'mainnet') {
        network = WalletAdapterNetwork.Mainnet;
    } else if (networkString === 'testnet') {
        network = WalletAdapterNetwork.Testnet;
    } else {
        network = WalletAdapterNetwork.Devnet; // Default to Devnet
    }

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => {
        if (network === WalletAdapterNetwork.Mainnet) {
            return process.env.NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET || clusterApiUrl(WalletAdapterNetwork.Mainnet);
        }
        if (network === WalletAdapterNetwork.Testnet) {
            return process.env.NEXT_PUBLIC_SOLANA_RPC_URL_TESTNET || clusterApiUrl(WalletAdapterNetwork.Testnet);
        }
        return process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET || clusterApiUrl(WalletAdapterNetwork.Devnet);
    }, [network]);

    const wallets = useMemo(
        () => [
            // Wallets that implement The Wallet Standard Desktop and Mobile specifications, 
            // (i.e. Phantom, Solflare, Backpack, Brave Wallet, etc.) are supported out of the box.
            // If you want to support other wallets, you can add them here.
            // See Chttps://github.com/solana-labs/wallet-adapter#wallets for a full list.
            // new PhantomWalletAdapter(), 
            // new SolflareWalletAdapter({ network }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default AppWalletProvider; 