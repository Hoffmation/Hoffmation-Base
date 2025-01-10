import { iUnifiConnectionOptions } from '../iUnifiConnectionOptions';
import { iUnifiProtectOptions } from '../iUnifiProtectOptions';

/**
 * The settings for the Unifi-Service (if needed).
 * Unifi is a network management system which can be used to monitor and control the network and devices.
 * Within Hoffmation it is mainly used to reconnect devices if they are not reachable.
 */
export interface iUnifiSettings {
  /**
   * The options for connecting to the Unifi controller
   */
  loginOptions?: iUnifiConnectionOptions;
  /**
   * The options for connecting to the Unifi NVR;
   */
  nvrOptions?: iUnifiProtectOptions;
}
