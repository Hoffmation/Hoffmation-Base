import {
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  BlockAutomaticUntilCommand,
  RestoreTargetAutomaticValueCommand,
} from '../command';

export interface iBlockAutomaticHandler {
  automaticBlockedUntil: Date;
  readonly automaticBlockActive: boolean;

  disableAutomatic(c: BlockAutomaticCommand): void;

  disableAutomaticUntil(c: BlockAutomaticUntilCommand): void;

  liftAutomaticBlock(c: BlockAutomaticLiftBlockCommand): void;

  removeRestoreTimeout(): void;

  updateRestoreTimeout(c: RestoreTargetAutomaticValueCommand): void;
}
