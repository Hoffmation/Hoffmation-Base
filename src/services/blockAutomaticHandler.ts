import _ from 'lodash';
import {
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  BlockAutomaticUntilCommand,
  RestoreTargetAutomaticValueCommand,
} from '../command';
import { CollisionSolving, CommandSource, LogDebugType, LogLevel } from '../enums';
import { Utils } from '../utils';
import { iBlockAutomaticHandler } from '../interfaces';

/**
 * This class is responsible for blocking automatic actions for a specific duration.
 * It also provides the possibility to lift the block before the duration is over {@link BlockAutomaticLiftBlockCommand}.
 */
export class BlockAutomaticHandler implements iBlockAutomaticHandler {
  private readonly _restoreAutomatic: (c: RestoreTargetAutomaticValueCommand) => void;
  private _automaticBlockedUntil: Date = new Date(0);
  private _blockSetByUser: boolean = false;
  private _restoreAutomaticStateTimeout: NodeJS.Timeout | null = null;

  public constructor(
    restoreAutomaticCb: (c: RestoreTargetAutomaticValueCommand) => void,
    private readonly _logger: (level: LogLevel, message: string, logDebugType?: LogDebugType) => void,
  ) {
    this._restoreAutomatic = restoreAutomaticCb;
  }

  public get automaticBlockedUntil(): Date {
    return this._automaticBlockedUntil;
  }

  private set automaticBlockedUntil(target) {
    this._automaticBlockedUntil = target;
  }

  public get automaticBlockActive(): boolean {
    return this._automaticBlockedUntil > new Date();
  }

  /**
   * Whether the active block was set by a person rather than by another rule.
   *
   * The expiry date alone cannot answer that, and a rule that has to decide whether it may overrule
   * the current state needs to: at the end of the day the user's choice outranks a configured
   * automatism. Manual, API and Force all count - they are the same decision reaching the house
   * through different doors.
   * @returns True while a block set by a person is still running.
   */
  public get automaticBlockedByUser(): boolean {
    return this.automaticBlockActive && this._blockSetByUser;
  }

  public disableAutomatic(c: BlockAutomaticCommand): void {
    this.disableAutomaticUntil(
      new BlockAutomaticUntilCommand(
        c,
        new Date(Utils.nowMS() + c.durationMS),
        '',
        c.onCollideAction,
        c.revertToAutomaticAtBlockLift,
      ),
    );
  }

  public disableAutomaticUntil(c: BlockAutomaticUntilCommand): void {
    const now = new Date();
    if (
      this._automaticBlockedUntil > now &&
      c.onCollideAction != CollisionSolving.override &&
      (c.onCollideAction != CollisionSolving.overrideIfGreater || c.targetDate < this._automaticBlockedUntil)
    ) {
      this._logger(
        LogLevel.Info,
        `Block already active until "${this.automaticBlockedUntil.toLocaleTimeString('de-DE')}" --> ignoring: ${c.logMessage}`,
      );
      return;
    }

    this._logger(LogLevel.Info, c.logMessage);
    this.automaticBlockedUntil = c.targetDate;
    // Recorded here rather than derived later: the command is gone once this returns, and the level
    // that pinned the device is exactly what a rule needs to know before overruling it.
    this._blockSetByUser = c.isForceAction;
    if (c.revertToAutomaticAtBlockLift) {
      const revertCommand = new RestoreTargetAutomaticValueCommand(c, 'Restore to automatic state after block.');
      revertCommand.overrideCommandSource = CommandSource.Automatic;
      this.updateRestoreTimeout(revertCommand);
    } else {
      this.removeRestoreTimeout();
    }
  }

  public liftAutomaticBlock(c: BlockAutomaticLiftBlockCommand): void {
    this.removeRestoreTimeout();
    this.automaticBlockedUntil = new Date(0);
    this._blockSetByUser = false;

    if (c.revertToAutomatic) {
      this._restoreAutomatic(new RestoreTargetAutomaticValueCommand(c));
    }
  }

  public removeRestoreTimeout(): void {
    if (this._restoreAutomaticStateTimeout !== null) {
      clearTimeout(this._restoreAutomaticStateTimeout);
      this._restoreAutomaticStateTimeout = null;
    }
  }

  public updateRestoreTimeout(c: RestoreTargetAutomaticValueCommand): void {
    this.removeRestoreTimeout();
    this._restoreAutomaticStateTimeout = Utils.guardedTimeout(
      () => {
        this._restoreAutomatic(c);
      },
      this._automaticBlockedUntil.getTime() - Utils.nowMS() + 500,
      this,
    );
  }

  public toJSON(): Partial<BlockAutomaticHandler> {
    return Utils.jsonFilter(_.omit(this, ['_restoreAutomatic', '_logger']));
  }
}
