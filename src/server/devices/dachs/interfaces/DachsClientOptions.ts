export interface DachsClientOptions {
  /**
   * The hostname or IP address of the Dachs device
   */
  host: string;
  /**
   * The protocol to use
   */
  protocol?: 'http' | 'https';
  /**
   * The port to use
   */
  port?: number;
  /**
   * The username to use for authentication
   */
  username?: string;
  /**
   * The password to use for authentication
   */
  password?: string;

  /**
   * Settings to define the result of requests
   */
  resultConfig?: {
    /**
     * Whether to add the raw value to the result
     */
    addRawValue?: boolean;
    /**
     * Whether to add the key object to the result
     */
    addKeyObject?: boolean;
    /**
     * Whether to flatten the result
     */
    flatten?: boolean;
  };
}
