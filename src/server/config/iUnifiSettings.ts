import { iUnifiConnectionOptions } from './iUnifiConnectionOptions';

export interface iUnifiSettings {
  /**
   * The options for connecting to the Unifi controller
   */
  loginOptions: iUnifiConnectionOptions;
}
