/**
 * Network Status Monitor
 *
 * Monitors device network connectivity and notifies subscribers of changes.
 * Provides utilities for checking current connection status and type.
 */


type ConnectionType = "wifi" | "cellular" | "none" | "unknown";
type ConnectivityCallback = (isOnline: boolean, type: ConnectionType) => void;

interface NetworkState {
  isOnline: boolean;
  type: ConnectionType;
}

class NetworkMonitor {
  private state: NetworkState = {
    isOnline: true,
    type: "unknown",
  };

  private subscribers: Set<ConnectivityCallback> = new Set();
  private pollInterval: NodeJS.Timer | null = null;

  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start monitoring network connectivity
   * Uses fetch-based polling as a lightweight alternative to native modules
   */
  private startMonitoring(): void {
    // Initial check
    this.checkConnectivity();

    // Poll every 5 seconds
    // @ts-expect-error - type assertion needed
    this.pollInterval = setInterval(() => {
      this.checkConnectivity();
    }, 5000);
  }

  /**
   * Check current connectivity status
   */
  private async checkConnectivity(): Promise<void> {
    try {
      // Try a lightweight HEAD request to detect connectivity
      const response = await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        cache: "no-cache",
      });

      const isOnline = response.ok || response.status === 204;
      const newType = isOnline ? "unknown" : "none";

      this.updateState(isOnline, newType);
    } catch {
      // Network error means no connectivity
      this.updateState(false, "none");
    }
  }

  /**
   * Update state and notify subscribers if changed
   */
  private updateState(isOnline: boolean, type: ConnectionType): void {
    if (this.state.isOnline !== isOnline || this.state.type !== type) {
      this.state = { isOnline, type };
      this.notifySubscribers();
    }
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(this.state.isOnline, this.state.type);
      } catch (error) {
        console.error("Error in connectivity callback:", error);
      }
    });
  }

  /**
   * Check if device is currently online
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Get current connection type
   */
  getConnectionType(): ConnectionType {
    return this.state.type;
  }

  /**
   * Subscribe to connectivity changes
   * Returns unsubscribe function
   */
  onConnectivityChange(callback: ConnectivityCallback): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.pollInterval) {
      // @ts-expect-error - overload mismatch
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.subscribers.clear();
  }
}

// Global instance
export const networkMonitor = new NetworkMonitor();

export type { ConnectionType, ConnectivityCallback, NetworkState };
