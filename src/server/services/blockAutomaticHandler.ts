import {
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  BlockAutomaticUntilCommand,
  CollisionSolving,
  RestoreTargetAutomaticValueCommand,
} from '../../models';
import { Utils } from './utils';
import _ from 'lodash';

export class BlockAutomaticHandler {
  private readonly _restoreAutomatic: (c: RestoreTargetAutomaticValueCommand) => void;
  private _automaticBlockedUntil: Date = new Date(0);
  private _restoreAutomaticStateTimeout: NodeJS.Timeout | null = null;

  public constructor(restoreAutomaticCb: (c: RestoreTargetAutomaticValueCommand) => void) {
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

  public disableAutomatic(c: BlockAutomaticCommand): void {
    this.disableAutomaticUntil(
      new BlockAutomaticUntilCommand(c, new Date(Utils.nowMS() + c.durationMS), '', c.onCollideAction),
    );
  }

  public disableAutomaticUntil(c: BlockAutomaticUntilCommand): void {
    const now = new Date();
    if (
      this._automaticBlockedUntil > now &&
      c.onCollideAction != CollisionSolving.override &&
      (c.onCollideAction != CollisionSolving.overrideIfGreater || c.targetDate < this._automaticBlockedUntil)
    ) {
      return;
    }
    this.automaticBlockedUntil = c.targetDate;
    this.updateRestoreTimeout(new RestoreTargetAutomaticValueCommand(c, 'Restore to automatic state after block.'));
  }

  public liftAutomaticBlock(c: BlockAutomaticLiftBlockCommand): void {
    if (this._restoreAutomaticStateTimeout !== null) {
      clearTimeout(this._restoreAutomaticStateTimeout);
    }
    this._restoreAutomaticStateTimeout = null;
    this.automaticBlockedUntil = new Date(0);

    this._restoreAutomatic(new RestoreTargetAutomaticValueCommand(c));
  }

  private updateRestoreTimeout(c: RestoreTargetAutomaticValueCommand): void {
    if (this._restoreAutomaticStateTimeout !== null) {
      clearTimeout(this._restoreAutomaticStateTimeout);
    }
    this._restoreAutomaticStateTimeout = Utils.guardedTimeout(
      () => {
        this._restoreAutomatic(c);
      },
      this._automaticBlockedUntil.getTime() - Utils.nowMS() + 500,
      this,
    );
  }

  public toJSON(): Partial<BlockAutomaticHandler> {
    return Utils.jsonFilter(_.omit(this, ['_restoreAutomatic']));
  }
}
