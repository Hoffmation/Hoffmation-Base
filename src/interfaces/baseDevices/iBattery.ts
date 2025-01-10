import { BatteryLevelChangeAction } from '../../action';
import { iBatteryDevice } from './iBatteryDevice';

/**
 *
 */
export interface iBattery {
  /**
   *
   */
  level: number;

  /** @inheritDoc */
  persist(): void;

  /**
   * Checks whether the battery level did change and if so fires the callbacks
   */
  checkForChange(): void;

  /**
   * Adds a callback for when the battery-level has Changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void;

  /**
   *
   */
  toJSON(): Partial<iBatteryDevice>;
}
