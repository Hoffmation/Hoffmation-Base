import { HeaterSettings, TemperaturSettings } from '../../models';
import { IBaseDevice } from './iBaseDevice';

export interface iHeater extends IBaseDevice {
  settings: HeaterSettings;
  readonly desiredTemperatur: number;
  readonly humidity: number;
  readonly iLevel: number;
  readonly iTemperatur: number;

  deleteAutomaticPoint(name: string): void;

  setAutomaticPoint(name: string, setting: TemperaturSettings): void;

  stopAutomaticCheck(): void;

  checkAutomaticChange(): void;

  onTemperaturChange(newTemperatur: number): void;
}
