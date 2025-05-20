import { iRoomDevice } from './iRoomDevice';
import { iDoorSettings } from '../deviceSettings';
import { DingSensorAction } from '../../action';

/**
 * An interface defining a door device
 */
export interface iDoorDevice extends iRoomDevice {
  /**
   * The settings of the doorbell device
   */
  settings: iDoorSettings;
  /**
   * Whether the doorbell is currently dinging
   */
  readonly dingActive: boolean;
  /**
   * The last time the doorbell received a data update.
   */
  readonly lastUpdate: Date;

  /**
   * The number of seconds since the last ding
   */
  readonly timeSinceDing: number;

  /**
   * The number of dings today
   */
  readonly dingsToday: number;

  /**
   * Adds a callback for when a ding state has changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  addDingCallback(pCallback: (action: DingSensorAction) => void): void;
}
