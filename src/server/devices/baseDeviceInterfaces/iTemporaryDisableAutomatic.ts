import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { iBaseDevice } from './iBaseDevice';
import { RestoreTargetAutomaticValueCommand } from '../../../models';

// TODO: Add missing Comments
export interface iTemporaryDisableAutomatic extends iBaseDevice {
  readonly blockAutomationHandler: BlockAutomaticHandler;

  restoreTargetAutomaticValue(command: RestoreTargetAutomaticValueCommand): void;
}
