import { LedSetLightCommand, LedSettings } from '../../../models';
import { iDimmableLamp } from './iDimmableLamp';

// TODO: Add missing Comments
export interface iLedRgbCct extends iDimmableLamp {
  settings: LedSettings;
  readonly color: string;
  readonly colortemp: number;

  setLight(c: LedSetLightCommand): void;
}
