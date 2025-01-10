import { iGroupSettings, iTemperatureSettings } from '../settings';
import { iIdHolder } from '../iIdHolder';

/**
 *
 */
export interface iHeatGroupSettings extends iGroupSettings {
  /**
   *
   */
  automaticMode: boolean;
  /**
   *
   */
  automaticPoints: iTemperatureSettings[];
  /**
   *
   */
  automaticFallBackTemperatur: number;
  /**
   *
   */
  manualTemperature: number;

  /**
   *
   */
  deleteAutomaticPoint(name: string, device: iIdHolder): void;

  /**
   *
   */
  setAutomaticPoint(setting: iTemperatureSettings, device: iIdHolder): void;

  /**
   *
   */
  toJSON(): Partial<iHeatGroupSettings>;
}
