import { HeatingMode } from './heatingMode';

export interface iHeaterSettings {
  /**
   * Whether heating with ac is allowed
   * This normally depends on the cost difference between ac heating and conventional heating
   */
  allowAcHeating?: boolean;
  mode?: HeatingMode;
}
