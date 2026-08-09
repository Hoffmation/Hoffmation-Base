import {
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  BlockAutomaticUntilCommand,
  RestoreTargetAutomaticValueCommand,
} from '../command';

/**
 *
 */
export interface iBlockAutomaticHandler {
  /**
   *
   */
  automaticBlockedUntil: Date;
  /**
   *
   */
  readonly automaticBlockActive: boolean;

  /**
   * Whether the active block was set by a person (Manual, API or Force) rather than by a rule.
   */
  readonly automaticBlockedByUser: boolean;

  /**
   *
   */
  disableAutomatic(c: BlockAutomaticCommand): void;

  /**
   *
   */
  disableAutomaticUntil(c: BlockAutomaticUntilCommand): void;

  /**
   *
   */
  liftAutomaticBlock(c: BlockAutomaticLiftBlockCommand): void;

  /**
   *
   */
  removeRestoreTimeout(): void;

  /**
   *
   */
  updateRestoreTimeout(c: RestoreTargetAutomaticValueCommand): void;
}
