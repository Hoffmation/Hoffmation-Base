import { CollisionSolving } from '../../models';
import { Utils } from './utils';
import _ from 'lodash';

export class BlockAutomaticHandler {
  private readonly _restoreAutomatic: () => void;

  public constructor(restoreAutomaticCb: () => void) {
    this._restoreAutomatic = restoreAutomaticCb;
  }

  private _automaticBlockedUntil: Date = new Date(0);

  public get automaticBlockedUntil(): Date {
    return this._automaticBlockedUntil;
  }

  private set automaticBlockedUntil(target) {
    this._automaticBlockedUntil = target;
    this.updateRestoreTimeout();
  }

  private _restoreAutomaticStateTimeout: NodeJS.Timeout | null = null;

  public get restoreAutomaticStateTimeout(): NodeJS.Timeout | null {
    return this._restoreAutomaticStateTimeout;
  }

  public get automaticBlockActive(): boolean {
    return this._automaticBlockedUntil > new Date();
  }

  public disableAutomatic(
    duration: number,
    onCollideAction: CollisionSolving = CollisionSolving.overrideIfGreater,
  ): void {
    this.disableAutomaticUntil(new Date(Utils.nowMS() + duration), onCollideAction);
  }

  public disableAutomaticUntil(
    targetDate: Date,
    onCollideAction: CollisionSolving = CollisionSolving.overrideIfGreater,
  ): void {
    const now = new Date();
    if (
      this._automaticBlockedUntil > now &&
      onCollideAction != CollisionSolving.override &&
      (onCollideAction != CollisionSolving.overrideIfGreater || targetDate < this._automaticBlockedUntil)
    ) {
      return;
    }
    this._automaticBlockedUntil = targetDate;
  }

  public liftAutomaticBlock(): void {
    this._automaticBlockedUntil = new Date(0);
  }

  private updateRestoreTimeout(): void {
    if (this._restoreAutomaticStateTimeout !== null) {
      clearTimeout(this._restoreAutomaticStateTimeout);
    }
    this._restoreAutomaticStateTimeout = Utils.guardedTimeout(
      this._restoreAutomatic,
      this._automaticBlockedUntil.getTime() - Utils.nowMS(),
      this,
    );
  }

  public toJSON(): Partial<BlockAutomaticHandler> {
    return Utils.jsonFilter(_.omit(this, ['_restoreAutomatic']));
  }
}
