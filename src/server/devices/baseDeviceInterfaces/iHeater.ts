import { HeaterSettings, TemperatureSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

export interface iHeater extends iRoomDevice {
  settings: HeaterSettings;
  desiredTemperature: number;
  readonly humidity: number;
  readonly iLevel: number;
  readonly iTemperature: number;
  roomTemperature: number;
  readonly persistHeaterInterval: NodeJS.Timeout;

  seasonTurnOff: boolean;

  deleteAutomaticPoint(name: string): void;

  setAutomaticPoint(name: string, setting: TemperatureSettings): void;

  stopAutomaticCheck(): void;

  checkAutomaticChange(): void;

  onTemperaturChange(newTemperatur: number): void;

  persistHeater(): void;
}
