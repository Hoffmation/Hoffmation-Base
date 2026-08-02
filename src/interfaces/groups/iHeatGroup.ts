import { iBaseGroup } from './iBaseGroup';
import { iAcDevice, iHeater, iHumidityCollector, iTemperatureCollector } from '../baseDevices';
import { iTemperatureSettings } from '../settings';
import { iHeatGroupSettings } from './iHeatGroupSettings';
import { CommandSource } from '../../enums';
import { iBaseCommand } from '../../command';

/**
 *
 */
export interface iHeatGroup extends iBaseGroup {
  /**
   *
   */
  settings: iHeatGroupSettings;
  /**
   *
   */
  readonly humidity: number;
  /**
   *
   */
  readonly temperature: number;
  /**
   *
   */
  readonly desiredTemp: number;

  /**
   *
   */
  getHeater(): iHeater[];

  /**
   *
   */
  getTempSensors(): iTemperatureCollector[];

  /**
   *
   */
  getHumiditySensors(): iHumidityCollector[];

  /**
   *
   */
  getOwnAcDevices(): iAcDevice[];

  /**
   *
   */
  initialize(): void;

  /**
   * Sets all ACs to new desired Value
   * @param newDesiredState - The new desired (on/off) state
   * @param source - The event this results from, so the device command can be traced back to it
   */
  setAc(newDesiredState: boolean, source: CommandSource | iBaseCommand): void;

  /**
   *
   */
  deleteAutomaticPoint(name: string): void;

  /**
   *
   */
  setAutomaticPoint(setting: iTemperatureSettings): void;

  /**
   *
   */
  recalcRoomTemperatur(): void;
}
