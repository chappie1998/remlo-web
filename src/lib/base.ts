import { createPublicClient, http, formatUnits, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { BASE_CONFIG } from './base-config';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_CONFIG.NETWORK.rpcUrl),
});

interface TokenBalance {
  balance: number;
  formattedBalance: string;
}

interface BaseBalances {
  eth: TokenBalance;
  usdc: TokenBalance;
}

export async function fetchAllBaseBalances(address: string): Promise<BaseBalances> {
  const checksummedAddress = getAddress(address);

  const [ethBalance, usdcBalance] = await Promise.all([
    publicClient.getBalance({ address: checksummedAddress }),
    publicClient.readContract({
      address: getAddress(BASE_CONFIG.TOKENS.USDC.address),
      abi: [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [checksummedAddress],
    }),
  ]);

  const ethFormatted = formatUnits(ethBalance, BASE_CONFIG.TOKENS.ETH.decimals);
  const usdcFormatted = formatUnits(usdcBalance as bigint, BASE_CONFIG.TOKENS.USDC.decimals);

  return {
    eth: {
      balance: Number(ethBalance),
      formattedBalance: ethFormatted,
    },
    usdc: {
      balance: Number(usdcBalance),
      formattedBalance: usdcFormatted,
    },
  };
} 