/**
 * Options to connect to the Unifi NVR/Protect System.
 */
export interface iUnifiProtectOptions {
  /**
   * The IP address/hostname of the NVR
   */
  nvrAddress: string;
  /**
   * The username for the NVR Api access.
   */
  username: string;
  /**
   * Separate Username for Unifi Access
   */
  usernameAccess: string;
  /**
   * The password for connecting to the NVR API.
   */
  password: string;
}
