import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { iBaseDevice } from './iBaseDevice';
import { RestoreTargetAutomaticValueCommand } from '../../../models';

export interface iTemporaryDisableAutomatic extends iBaseDevice {
  readonly blockAutomationHandler: BlockAutomaticHandler;

  restoreTargetAutomaticValue(command: RestoreTargetAutomaticValueCommand): void;
}
