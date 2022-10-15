import { LedSettings, TimeOfDay } from '../../../models';
import { iDimmableLamp } from './iDimmableLamp';

export interface iLedRgbCct extends iDimmableLamp {
  settings: LedSettings;
  readonly color: string;
  readonly colortemp: number;

  update(idSplit: string[], state: ioBroker.State, initial: boolean): void;

  /**
   * @inheritDoc
   */
  setTimeBased(time: TimeOfDay, timeout?: number, force?: boolean): void;

  /**
   * @inheritDoc
   * @param pValue
   * @param timeout
   * @param force
   * @param brightness
   * @param transitionTime
   * @param {string} color The desired color in 6 digit hex Code
   * @param {number} colorTemp The desired color Temperature (0 = more White)
   */
  setLight(
    pValue: boolean,
    timeout?: number,
    force?: boolean,
    brightness?: number,
    transitionTime?: number,
    color?: string,
    colorTemp?: number,
  ): void;
}
