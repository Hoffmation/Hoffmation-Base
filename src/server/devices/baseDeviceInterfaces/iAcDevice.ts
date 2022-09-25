import { AcSettings } from '../../../models/deviceSettings/acSettings';
import { AcMode } from '../../services';
import { iBaseDevice } from './iBaseDevice';

export interface iAcDevice extends iBaseDevice {
  acSettings: AcSettings;
  readonly on: boolean;
  readonly temperature: number;

  /**
   * Disable automatic Turn-On for given amount of ms and turn off immediately.
   * @param {number} timeout
   */
  deactivateAutomaticChange(timeout: number): void;

  onTemperaturChange(newTemperatur: number): void;

  setDesiredMode(mode: AcMode, writeToDevice: boolean): void;

  turnOn(): void;

  turnOff(): void;
}
