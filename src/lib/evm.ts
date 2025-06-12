import { ethers } from 'ethers';

// Base Sepolia RPC endpoint
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

// ERC-20 ABI for balanceOf function
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

/**
 * Fetch Base Sepolia USDC balance for an EVM address
 */
export async function fetchBaseUsdcBalance(address: string): Promise<{
  balance: string;
  formattedBalance: string;
}> {
  try {
    const baseUsdcAddress = process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS;
    
    if (!baseUsdcAddress) {
      console.warn('NEXT_PUBLIC_BASE_USDC_ADDRESS not configured');
      return {
        balance: '0',
        formattedBalance: '0.000000',
      };
    }

    // Create provider for Base Sepolia
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    // Create contract instance
    const contract = new ethers.Contract(baseUsdcAddress, ERC20_ABI, provider);
    
    // Get balance and decimals in parallel
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
    ]);
    
    // Format balance (USDC typically has 6 decimals)
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    return {
      balance: balance.toString(),
      formattedBalance: parseFloat(formattedBalance).toFixed(6),
    };
  } catch (error) {
    console.error('Error fetching Base USDC balance:', error);
    return {
      balance: '0',
      formattedBalance: '0.000000',
    };
  }
}

/**
 * Check if address is a valid EVM address
 */
export function isValidEvmAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
} 