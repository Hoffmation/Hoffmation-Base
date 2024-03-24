/**
 * The configuration for the Blue-Iris Instance (if present).
 * Blue-Iris is a software to manage IP-Cameras
 * Settings for {@link BlueIrisCoordinator} to connect to a Blue-Iris instance
 */
export interface iBlueIrisSettings {
  /**
   * The hostname of the Blue-Iris Instance
   */
  serverAddress: string;
  /**
   * If needed, the username to authenticate with
   */
  username?: string;
  /**
   * If needed, the password to authenticate with.
   */
  password?: string;
}
