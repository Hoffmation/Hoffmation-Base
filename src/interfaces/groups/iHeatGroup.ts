import { iBaseGroup } from './iBaseGroup';
import { iAcDevice, iHeater, iHumidityCollector, iTemperatureCollector } from '../baseDevices';
import { iTemperatureSettings } from '../settings';
import { iHeatGroupSettings } from './iHeatGroupSettings';

export interface iHeatGroup extends iBaseGroup {
  settings: iHeatGroupSettings;
  readonly humidity: number;
  readonly temperature: number;
  readonly desiredTemp: number;

  getHeater(): iHeater[];

  getTempSensors(): iTemperatureCollector[];

  getHumiditySensors(): iHumidityCollector[];

  getOwnAcDevices(): iAcDevice[];

  initialize(): void;

  /**
   * Sets all ACs to new desired Value
   * TODO: Migrate to new Command System
   * @param newDesiredState - The new desired (on/off) state
   * @param force - Whether this was a manual trigger, thus blocking automatic changes for 1 hour
   */
  setAc(newDesiredState: boolean, force: boolean): void;

  deleteAutomaticPoint(name: string): void;

  setAutomaticPoint(setting: iTemperatureSettings): void;

  recalcRoomTemperatur(): void;
}
