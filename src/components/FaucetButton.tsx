import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FaucetButtonProps {
  usdcBalance: number;
  onFaucetComplete: () => void;
}

export default function FaucetButton({ usdcBalance, onFaucetComplete }: FaucetButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const requestFaucetTokens = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/wallet/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request tokens from faucet');
      }
      
      toast.success(data.message || 'Tokens received! Your wallet will update shortly.');
      onFaucetComplete();
    } catch (error) {
      console.error('Faucet error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to request tokens');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show button if USDC balance is less than 1
  if (usdcBalance >= 2) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-zinc-700 pt-3">
      <Button
        onClick={requestFaucetTokens}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="w-full bg-blue-800/30 text-blue-300 border-blue-700/50 hover:bg-blue-800/50 hover:text-blue-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Requesting...
          </>
        ) : (
          <>Get 10 USDC from Faucet</>
        )}
      </Button>
      <p className="text-xs text-gray-400 mt-1 text-center">For testing with low balance</p>
    </div>
  );
} 