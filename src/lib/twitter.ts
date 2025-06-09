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

// Enhanced cache with different types of results
interface CacheEntry {
  result: {
    valid: boolean;
    user?: TwitterUser;
    error?: string;
  };
  timestamp: number;
  type: 'api_success' | 'api_failure' | 'rate_limited' | 'format_error';
}

const validationCache = new Map<string, CacheEntry>();
const CACHE_DURATIONS = {
  api_success: 5 * 60 * 1000,    // 5 minutes for successful API calls
  api_failure: 2 * 60 * 1000,    // 2 minutes for failed API calls (user not found)
  rate_limited: 60 * 1000,       // 1 minute for rate limited responses
  format_error: 10 * 60 * 1000,  // 10 minutes for format errors
};

/**
 * Enhanced Twitter username validation with proper caching and no fallback validation
 */
export async function validateTwitterUsername(username: string): Promise<{
  valid: boolean;
  user?: TwitterUser;
  error?: string;
}> {
  // Remove @ if present and clean username
  const cleanUsername = username.replace(/^@/, '').trim();
  
  // Basic format validation
  if (!cleanUsername || cleanUsername.length < 1) {
    return { valid: false, error: 'Invalid username format' };
  }

  if (cleanUsername.length > 15) {
    return { valid: false, error: 'Twitter usernames cannot exceed 15 characters' };
  }

  // Check if it's a valid Twitter username format
  const twitterUsernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
  if (!twitterUsernameRegex.test(cleanUsername)) {
    return { 
      valid: false, 
      error: 'Invalid Twitter username format (1-15 characters, letters, numbers, underscore only)' 
    };
  }

  // Check cache first
  const cacheKey = cleanUsername.toLowerCase();
  const cached = validationCache.get(cacheKey);
  
  if (cached) {
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = CACHE_DURATIONS[cached.type];
    
    if (cacheAge < maxAge) {
      console.log(`📋 Using cached result for ${cleanUsername} (${cached.type}, age: ${Math.round(cacheAge / 1000)}s)`);
      return cached.result;
    } else {
      // Remove expired cache entry
      validationCache.delete(cacheKey);
    }
  }

  // If no API token is configured, we cannot validate
  if (!TWITTER_BEARER_TOKEN) {
    const result = { 
      valid: false, 
      error: 'Twitter API not configured. Cannot verify if this username exists.' 
    };
    
    validationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      type: 'format_error'
    });
    
    return result;
  }

  // Make API call to validate username
  try {
    console.log(`🔍 Making Twitter API call for ${cleanUsername}`);
    
    const response = await fetch(
      `${TWITTER_API_BASE}/users/by/username/${cleanUsername}?user.fields=profile_image_url,name`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data: TwitterAPIResponse = await response.json();

    if (response.status === 429) {
      // Rate limit exceeded - DO NOT VALIDATE AS SUCCESSFUL
      console.log('Twitter API rate limit exceeded, cannot verify account existence');
      
      const result = {
        valid: false,
        error: 'Twitter API rate limited. Please try again in a few minutes.',
      };

      validationCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        type: 'rate_limited'
      });

      return result;
    }

    if (response.ok && data.data) {
      // User found successfully
      const result = {
        valid: true,
        user: data.data,
      };

      console.log(`✅ Twitter user found: @${data.data.username} (${data.data.name})`);

      validationCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        type: 'api_success'
      });

      return result;
    } else {
      // User not found or other API error
      const errorMessage = data.errors?.[0]?.detail || 'User not found';
      console.log(`❌ Twitter user not found: ${cleanUsername} - ${errorMessage}`);
      
      const result = {
        valid: false,
        error: errorMessage,
      };

      validationCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        type: 'api_failure'
      });

      return result;
    }

  } catch (error) {
    console.error('Twitter username validation error:', error);
    
    const result = {
      valid: false,
      error: 'Network error. Please try again.',
    };
    
    validationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      type: 'api_failure'
    });
    
    return result;
  }
}

/**
 * Clear cache entries (useful for testing or manual cache management)
 */
export function clearTwitterCache(): void {
  validationCache.clear();
  console.log('🧹 Twitter validation cache cleared');
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getTwitterCacheStats(): {
  size: number;
  entries: Array<{
    username: string;
    type: string;
    age: number;
    valid: boolean;
  }>;
} {
  const now = Date.now();
  const entries = Array.from(validationCache.entries()).map(([username, entry]) => ({
    username,
    type: entry.type,
    age: Math.round((now - entry.timestamp) / 1000),
    valid: entry.result.valid
  }));

  return {
    size: validationCache.size,
    entries
  };
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