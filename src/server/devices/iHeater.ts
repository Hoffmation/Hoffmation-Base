import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { TemperaturSettings } from '../../models/temperaturSettings';

export interface iHeater extends IoBrokerBaseDevice {
  readonly desiredTemperatur: number;
  readonly iLevel: number;
  readonly iTemperatur: number;

  deleteAutomaticPoint(name: string): void;

  setAutomaticPoint(name: string, setting: TemperaturSettings): void;

  stopAutomaticCheck(): void;

  checkAutomaticChange(): void;
}
