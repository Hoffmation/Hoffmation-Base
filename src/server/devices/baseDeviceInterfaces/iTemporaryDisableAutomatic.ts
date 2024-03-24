import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { iBaseDevice } from './iBaseDevice';
import { RestoreTargetAutomaticValueCommand } from '../../../models';

export interface iTemporaryDisableAutomatic extends iBaseDevice {
  /**
   * The block automation handler containing the current block state/time, etc.
   */
  readonly blockAutomationHandler: BlockAutomaticHandler;

  /**
   * Restores the automatic value/state of the device
   * @param {RestoreTargetAutomaticValueCommand} command - The command to restore the automatic value/state
   */
  restoreTargetAutomaticValue(command: RestoreTargetAutomaticValueCommand): void;
}
