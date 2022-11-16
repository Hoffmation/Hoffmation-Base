import { CollisionSolving } from '../../../models';

export interface iTemporaryDisableAutomatic {
  readonly automaticBlockedUntil: Date;

  disableAutomatic(duration: number, onCollideAction?: CollisionSolving): void;

  liftAutomaticBlock(): void;
}
