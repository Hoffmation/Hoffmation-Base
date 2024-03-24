/**
 * The options neded to connect to a Unifi controller
 */
export interface iUnifiConnectionOptions {
  /**
   * The host address of the Unifi controller (or its IP address)
   */
  host?: string;
  /**
   * The port of the Unifi controller
   */
  port?: number;
  /**
   * The username used to log in to the Unifi controller (if needed)
   */
  username?: string;
  /**
   * The password used to log in to the Unifi controller (if needed)
   */
  password?: string;
  /**
   * The 2FA token used to log in to the Unifi controller (if needed)
   * @warning This is not recommended to be used, as after a reboot you would need a new token
   */
  token2FA?: string;
  /**
   * The site of this house (if needed)
   */
  site?: string;
  /**
   * Whether to verify the SSL certificate of the Unifi controller or connect anyway
   */
  sslverify?: boolean;
  /**
   * The timeout for the connection to the Unifi controller
   */
  timeout?: number;
  /**
   * Whether to stay logged in or to reauthenticate on each request
   */
  rememberMe?: boolean;
}
