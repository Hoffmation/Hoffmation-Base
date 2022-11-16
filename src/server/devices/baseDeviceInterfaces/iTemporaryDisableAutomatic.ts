import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { iBaseDevice } from './iBaseDevice';

export interface iTemporaryDisableAutomatic extends iBaseDevice {
  readonly blockAutomationHandler: BlockAutomaticHandler;

  restoreTargetAutomaticValue(): void;
}
