import { CollisionSolving } from '../../../models';

export interface iTemporaryDisableAutomatic {
  readonly automaticBlockedUntil: Date;
  readonly automaticBlockActive: boolean;
  readonly restoreAutomaticStateTimeout: NodeJS.Timeout | null;

  disableAutomatic(duration: number, onCollideAction?: CollisionSolving): void;

  liftAutomaticBlock(): void;
}
