import { LedSetLightCommand, LedSettings } from '../../../models';
import { iDimmableLamp } from './iDimmableLamp';

export interface iLedRgbCct extends iDimmableLamp {
  settings: LedSettings;
  readonly color: string;
  readonly colortemp: number;

  setLight(c: LedSetLightCommand): void;
}
