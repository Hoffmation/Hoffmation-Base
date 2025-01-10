/**
 * Interface for objects that need to be disposed of (e.g. to free up resources or disable timeouts/intervals)
 */
export interface iDisposable {
  /**
   * Dispose of the object --> free up resources, disable timeouts/intervals, etc.
   */
  dispose(): void;
}
