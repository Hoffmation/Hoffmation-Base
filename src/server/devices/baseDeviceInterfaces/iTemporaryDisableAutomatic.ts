import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';

export interface iTemporaryDisableAutomatic {
  readonly blockAutomationHandler: BlockAutomaticHandler;

  restoreTargetAutomaticValue(): void;
}
