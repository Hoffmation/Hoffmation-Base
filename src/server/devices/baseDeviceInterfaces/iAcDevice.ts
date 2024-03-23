import { AcSettings } from '../../../models';
import { AcMode } from '../../services';
import { iBaseDevice } from './iBaseDevice';

// TODO: Migrate to new Command-Based System
// TODO: Add missing Comments
export interface iAcDevice extends iBaseDevice {
  settings: AcSettings;
  readonly on: boolean;
  readonly temperature: number;
  readonly mode: AcMode;

  onTemperaturChange(newTemperatur: number): void;

  setDesiredMode(mode: AcMode, writeToDevice: boolean): void;

  turnOn(): void;

  turnOff(): void;
}
