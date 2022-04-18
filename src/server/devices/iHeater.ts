import { TemperaturSettings } from '../../models';
import { IBaseDevice } from './iBaseDevice';

export interface iHeater extends IBaseDevice {
  readonly desiredTemperatur: number;
  readonly iLevel: number;
  readonly iTemperatur: number;

  deleteAutomaticPoint(name: string): void;

  setAutomaticPoint(name: string, setting: TemperaturSettings): void;

  stopAutomaticCheck(): void;

  checkAutomaticChange(): void;
}
