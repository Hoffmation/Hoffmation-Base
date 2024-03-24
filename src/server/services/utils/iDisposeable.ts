export interface iDisposable {
  /**
   * Dispose of the object --> free up resources, disable timeouts/intervals, etc.
   */
  dispose(): void;
}
