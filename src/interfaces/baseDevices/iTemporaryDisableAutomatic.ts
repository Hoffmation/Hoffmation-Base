import { iBaseDevice } from './iBaseDevice';
import { RestoreTargetAutomaticValueCommand } from '../../command';
import { iBlockAutomaticHandler } from '../iBlockAutomaticHandler';

/**
 * This interface represents a device which automatic action can be temporarily disabled.
 * E.g. Forcing a lamp to stay on, even if the automatic would turn it off.
 *
 * For devices with {@link DeviceCapability.blockAutomatic} capability.
 */
export interface iTemporaryDisableAutomatic extends iBaseDevice {
  /**
   * The block automation handler containing the current block state/time, etc.
   */
  readonly blockAutomationHandler: iBlockAutomaticHandler;

  /**
   * Restores the automatic value/state of the device
   * @param command - The command to restore the automatic value/state
   */
  restoreTargetAutomaticValue(command: RestoreTargetAutomaticValueCommand): void;
}
