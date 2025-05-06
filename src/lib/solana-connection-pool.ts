import { Connection, ConnectionConfig, Commitment } from '@solana/web3.js';

/**
 * A simple connection pool for Solana connections.
 * This helps avoid creating new connections for every request.
 */
class SolanaConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private defaultEndpoint: string;

  constructor() {
    this.defaultEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    console.log(`Initializing Solana connection pool with default endpoint: ${this.defaultEndpoint}`);
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
      console.log(`Creating new Solana connection to: ${endpoint}`);
      const connection = new Connection(endpoint, {
        commitment,
        confirmTransactionInitialTimeout: 60000, // 60 seconds
        ...config,
      });
      this.connections.set(key, connection);
      return connection;
    }

    return this.connections.get(key)!;
  }

  /**
   * Clear all connections from the pool
   */
  clearConnections(): void {
    this.connections.clear();
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
}

// Export a singleton instance
const connectionPool = new SolanaConnectionPool();
export default connectionPool; 