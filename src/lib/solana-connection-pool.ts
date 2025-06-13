import { Connection, ConnectionConfig, Commitment } from '@solana/web3.js';

/**
 * A simple connection pool for Solana connections.
 * This helps avoid creating new connections for every request.
 */
class SolanaConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private defaultEndpoint: string;
  private maxConnections: number = 10;
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private connectionUsageCount: Map<string, number> = new Map();
  private static instance: SolanaConnectionPool;

  constructor() {
    this.defaultEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    console.log(`Initializing Solana connection pool with default endpoint: ${this.defaultEndpoint}`);
  }

  static getInstance(): SolanaConnectionPool {
    if (!SolanaConnectionPool.instance) {
      SolanaConnectionPool.instance = new SolanaConnectionPool();
    }
    return SolanaConnectionPool.instance;
  }

  /**
   * Get a connection from the pool, or create a new one if it doesn't exist
   * @param endpoint The Solana RPC endpoint
   * @param commitment The commitment level
   * @param config Additional connection configuration
   * @returns A Solana Connection object
   */
  getConnection(
    endpoint: string = this.defaultEndpoint,
    commitment: Commitment = 'confirmed',
    config?: ConnectionConfig
  ): Connection {
    const key = `${endpoint}-${commitment}-${JSON.stringify(config || {})}`;
    
    if (!this.connections.has(key)) {
      // Check if we've hit the max connection limit
      if (this.connections.size >= this.maxConnections) {
        console.warn(`Connection pool at max capacity (${this.maxConnections}), reusing oldest connection`);
        // Get the first (oldest) connection
        const firstKey = this.connections.keys().next().value;
        if (firstKey) {
          // Track usage
          const currentUsage = this.connectionUsageCount.get(firstKey) || 0;
          this.connectionUsageCount.set(firstKey, currentUsage + 1);
          console.log(`Reusing connection: ${firstKey} (used ${currentUsage + 1} times)`);
          return this.connections.get(firstKey)!;
        }
      }

      console.log(`Creating new Solana connection to: ${endpoint} (${this.connections.size + 1}/${this.maxConnections})`);
      const connection = new Connection(endpoint, {
        commitment,
        confirmTransactionInitialTimeout: 30000, // Reduced from 60s to 30s
        fetch: (url, init) => {
          // Add timeout to fetch requests
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), 10000); // 10 second timeout
          
          return fetch(url, {
            ...init,
            signal: timeoutController.signal,
          }).finally(() => clearTimeout(timeoutId));
        },
        ...config,
      });
      
      this.connections.set(key, connection);
      this.connectionUsageCount.set(key, 1);
      
      // Set up cleanup timeout for unused connections
      this.setupConnectionCleanup(key);
      
      return connection;
    }

    // Track reuse
    const currentUsage = this.connectionUsageCount.get(key) || 0;
    this.connectionUsageCount.set(key, currentUsage + 1);
    console.log(`Reusing existing connection: ${key} (used ${currentUsage + 1} times)`);

    // Reset cleanup timeout for reused connections
    this.setupConnectionCleanup(key);
    return this.connections.get(key)!;
  }

  /**
   * Set up automatic cleanup for unused connections
   */
  private setupConnectionCleanup(key: string): void {
    // Clear existing timeout
    const existingTimeout = this.connectionTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set different timeouts based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cleanupTime = isDevelopment ? 30 * 60 * 1000 : 10 * 60 * 1000; // 30min dev, 10min prod

    // Set new timeout for inactivity
    const timeout = setTimeout(() => {
      const usageCount = this.connectionUsageCount.get(key) || 0;
      this.connections.delete(key);
      this.connectionTimeouts.delete(key);
      this.connectionUsageCount.delete(key);
      console.log(`Cleaned up unused connection: ${key} (was used ${usageCount} times)`);
    }, cleanupTime);

    this.connectionTimeouts.set(key, timeout);
  }

  /**
   * Clear all connections from the pool
   */
  clearConnections(): void {
    // Clear all timeouts
    this.connectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.connectionTimeouts.clear();
    this.connectionUsageCount.clear();
    this.connections.clear();
    console.log('Cleared all connections from pool');
  }

  /**
   * Get the default RPC endpoint
   */
  getDefaultEndpoint(): string {
    return this.defaultEndpoint;
  }

  /**
   * Get the number of connections in the pool
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection usage statistics
   */
  getConnectionStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.connectionUsageCount.forEach((count, key) => {
      stats[key] = count;
    });
    return stats;
  }
}

// Export a singleton instance
const connectionPool = SolanaConnectionPool.getInstance();
export default connectionPool; 