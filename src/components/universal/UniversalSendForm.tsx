"use client";

import { useState } from "react";
import { useOkto, tokenTransfer } from "@okto_web3/react-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { BASE_CONFIG, parseBaseAmount } from "@/lib/base-config";
import { getSupportedTokensForUser } from "@/lib/base-config";

interface TransferPreparation {
  transactionId: string;
  route: 'solana' | 'base';
  recipient: {
    username: string;
    solanaAddress?: string;
    baseAddress?: string;
  };
  amount: string;
  tokenSymbol: string;
  blockchain: 'solana' | 'base';
}

export function UniversalSendForm() {
  const oktoClient = useOkto();
  const [recipientUsername, setRecipientUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("USDC");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transferPrep, setTransferPrep] = useState<TransferPreparation | null>(null);
  const [passcode, setPasscode] = useState("");

  const supportedTokens = getSupportedTokensForUser();
  const preferredTokens = supportedTokens.filter(t => t.preferred);

  const handlePrepareTransfer = async () => {
    try {
      setIsLoading(true);

      if (!recipientUsername || !amount || !tokenSymbol) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Clean username (remove @ if present)
      const cleanUsername = recipientUsername.replace("@", "");

      const response = await fetch('/api/universal/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientUsername: cleanUsername,
          amount,
          tokenSymbol,
          note,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransferPrep(data);
        toast.success(`Transfer prepared via ${data.route} blockchain`);
      } else {
        toast.error(data.error || "Transfer preparation failed");
      }
    } catch (error) {
      console.error("Transfer preparation error:", error);
      toast.error("Failed to prepare transfer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferPrep) return;

    try {
      setIsLoading(true);

      if (transferPrep.route === 'base') {
        // Execute Base transfer using Okto
        const tokenConfig = BASE_CONFIG.TOKENS[tokenSymbol as keyof typeof BASE_CONFIG.TOKENS];
        const amountInSmallestUnit = parseBaseAmount(amount, tokenConfig.decimals);

        const transferParams = {
          amount: amountInSmallestUnit,
          recipient: transferPrep.recipient.baseAddress! as `0x${string}`,
          token: tokenConfig.address,
          caip2Id: BASE_CONFIG.NETWORK.caip2Id,
        };

        const jobId = await tokenTransfer(oktoClient, transferParams);
        
        // Update transaction status
        await fetch('/api/universal/send', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionId: transferPrep.transactionId,
            status: 'pending',
            oktoJobId: jobId,
          }),
        });

        toast.success("Transfer sent via Base! Transaction is processing...");
        
      } else {
        // Execute Solana transfer
        if (!passcode || passcode.length !== 6) {
          toast.error("Please enter your 6-digit passcode");
          return;
        }

        const response = await fetch('/api/wallet/send-token-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientAddress: transferPrep.recipient.solanaAddress,
            amount,
            tokenType: tokenSymbol.toLowerCase(),
            passcode,
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          // Update universal transaction
          await fetch('/api/universal/send', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionId: transferPrep.transactionId,
              status: 'pending',
              solanaSignature: data.signature,
            }),
          });

          toast.success("Transfer sent via Solana! Transaction is processing...");
        } else {
          toast.error(data.error || "Solana transfer failed");
          return;
        }
      }

      // Reset form
      setTransferPrep(null);
      setRecipientUsername("");
      setAmount("");
      setNote("");
      setPasscode("");

    } catch (error) {
      console.error("Transfer execution error:", error);
      toast.error("Transfer failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Money
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Send to any username - we'll find the best route
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!transferPrep ? (
          <>
            <div>
              <Label htmlFor="recipient">Send to Username</Label>
              <Input
                id="recipient"
                placeholder="@username or username"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="token">Token</Label>
                <Select value={tokenSymbol} onValueChange={setTokenSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {preferredTokens.map((token) => (
                      <SelectItem key={`${token.symbol}-${token.blockchain}`} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="What's this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button 
              onClick={handlePrepareTransfer}
              disabled={isLoading || !recipientUsername || !amount}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  Prepare Transfer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Transfer Ready
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>To:</strong> @{transferPrep.recipient.username}</p>
                <p><strong>Amount:</strong> {transferPrep.amount} {transferPrep.tokenSymbol}</p>
                <p><strong>Via:</strong> {transferPrep.route === 'base' ? 'Base (Gas-free)' : 'Solana'}</p>
                {note && <p><strong>Note:</strong> {note}</p>}
              </div>
            </div>

            {transferPrep.route === 'solana' && (
              <div>
                <Label htmlFor="passcode">Enter Passcode to Confirm</Label>
                <Input
                  id="passcode"
                  type="password"
                  placeholder="6-digit passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  maxLength={6}
                  className="font-mono text-center"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setTransferPrep(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteTransfer}
                disabled={isLoading || (transferPrep.route === 'solana' && passcode.length !== 6)}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Now"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 