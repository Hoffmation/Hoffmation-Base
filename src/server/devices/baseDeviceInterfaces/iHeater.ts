import { HeaterSettings, TemperatureSettings } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

export interface iHeater extends iBaseDevice {
  settings: HeaterSettings;
  desiredTemperature: number;
  readonly humidity: number;
  readonly iLevel: number;
  readonly iTemperature: number;

  set seasonTurnOff(value: boolean);

  deleteAutomaticPoint(name: string): void;

  setAutomaticPoint(name: string, setting: TemperatureSettings): void;

  stopAutomaticCheck(): void;

  checkAutomaticChange(): void;

  onTemperaturChange(newTemperatur: number): void;
}
