import { HeatingMode } from './heatingMode';

/**
 * Additional settings for the heating system (if present)
 */
export interface iHeaterSettings {
  /**
   * Whether heating with ac is allowed
   * This normally depends on the cost difference between ac heating and conventional heating
   */
  allowAcHeating?: boolean;
  /**
   * The desired Heating mode of the house.
   * As of today you have to manually switch between summer and winter.
   * TODO: Add heating Mode change to persisted settings and allow controlling it via the app
   */
  mode?: HeatingMode;
}
