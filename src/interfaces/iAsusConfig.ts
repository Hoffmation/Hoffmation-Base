/**
 * The configuration needed to connect to an Asus Router
 */
export interface iAsusConfig {
  /**
   * The hostname of the Router (or it's IP-Address)
   */
  address: string;
  /**
   * Whether to Ignore SSL warnings/error
   */
  ignoreSSL?: boolean;
  /**
   * The password needed for authentication
   */
  password: string;
  /**
   * The username to connect with.
   */
  username: string;
}
