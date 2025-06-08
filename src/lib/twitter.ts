interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface TwitterAPIResponse {
  data?: TwitterUser;
  errors?: Array<{ detail: string }>;
}

// Get Twitter API Bearer Token from environment
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_API_BASE = 'https://api.twitter.com/2';

// Simple cache to prevent rapid successive calls and handle rate limits
const validationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Validate if a Twitter username exists
 */
export async function validateTwitterUsername(username: string): Promise<{
  valid: boolean;
  user?: TwitterUser;
  error?: string;
}> {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, '');
  
  // Check cache first to prevent rapid successive calls
  const cacheKey = cleanUsername.toLowerCase();
  const cached = validationCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📋 Using cached result for ${cleanUsername}`);
    return cached.result;
  }

  if (!TWITTER_BEARER_TOKEN) {
    // Twitter API not configured - provide limited validation
    console.log('Twitter API not configured, checking format only');
    
    if (!cleanUsername || cleanUsername.length < 1) {
      return { valid: false, error: 'Invalid username format' };
    }

    // Check if it's a valid Twitter username format
    const twitterUsernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
    
    if (!twitterUsernameRegex.test(cleanUsername)) {
      const result = { valid: false, error: 'Invalid Twitter username format (1-15 characters, letters, numbers, underscore only)' };
      validationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // Known test usernames for demo purposes
    const knownTestUsers = ['elonmusk', 'twitter', 'jack', 'sundarpichai', 'tim_cook'];
    
    if (knownTestUsers.includes(cleanUsername.toLowerCase())) {
      const result = {
        valid: true,
        user: {
          id: `demo_${cleanUsername}`,
          username: cleanUsername,
          name: cleanUsername,
          profile_image_url: `https://via.placeholder.com/40?text=${cleanUsername[0].toUpperCase()}`
        }
      };
      validationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // For unknown usernames, indicate we can't verify without API
    const result = { 
      valid: false, 
      error: 'Twitter API not configured. Cannot verify if this username exists.' 
    };
    
    validationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  if (!cleanUsername || cleanUsername.length < 1) {
    return { valid: false, error: 'Invalid username format' };
  }

  try {
    const response = await fetch(
      `${TWITTER_API_BASE}/users/by/username/${cleanUsername}?user.fields=profile_image_url`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data: TwitterAPIResponse = await response.json();

    if (response.status === 429) {
      // Rate limit exceeded - cannot verify existence
      console.log('Twitter API rate limit exceeded, cannot verify account existence');
      
      return {
        valid: false,
        error: 'Twitter API rate limited. Please try again in a few minutes.',
      };
    }

    let result;
    if (response.ok && data.data) {
      result = {
        valid: true,
        user: data.data,
      };
    } else {
      result = {
        valid: false,
        error: data.errors?.[0]?.detail || 'User not found',
      };
    }

    // Cache the result
    validationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;

  } catch (error) {
    console.error('Twitter username validation error:', error);
    const result = {
      valid: false,
      error: 'Failed to validate username',
    };
    
    // Cache the error result too (for a shorter duration)
    validationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
}

/**
 * Send a DM to a Twitter user (requires elevated access)
 */
export async function sendTwitterDM(
  recipientId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!TWITTER_BEARER_TOKEN) {
    // For testing purposes, simulate DM sending
    console.log('Twitter API not configured, simulating DM send to:', recipientId);
    console.log('Message:', message);
    return { success: true };
  }

  try {
    // Note: This requires Twitter API v2 with elevated access and DM permissions
    const response = await fetch(`${TWITTER_API_BASE}/dm_conversations/with/${recipientId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.errors?.[0]?.detail || 'Failed to send DM',
      };
    }
  } catch (error) {
    console.error('Twitter DM sending error:', error);
    return {
      success: false,
      error: 'Failed to send DM',
    };
  }
}

/**
 * Create a payment message for Twitter DM
 */
export function createPaymentMessage(
  senderName: string,
  amount: string,
  tokenType: string,
  paymentLink: string
): string {
  const tokenSymbol = tokenType === 'usds' ? 'USDS' : 'USDC';
  
  return `🎉 You've received ${amount} ${tokenSymbol} from ${senderName}!

💰 Claim your payment here: ${paymentLink}

Powered by Remlo Wallet - Fast, secure crypto payments`;
} 