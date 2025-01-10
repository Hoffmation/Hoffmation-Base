import { CollisionSolving } from '../../enums';

/**
 *
 */
export interface iBlockAutomaticSettings {
  /**
   *
   */
  blockAutomaticDurationMS?: number;
  /**
   *
   */
  dontBlockAutomaticIfNotProvided?: boolean;
  /**
   *
   */
  defaultCollisionSolving?: CollisionSolving;
  /**
   *
   */
  revertToAutomaticAtBlockLift?: boolean;

  /**
   *
   */
  fromPartialObject(obj: Partial<iBlockAutomaticSettings>): void;
}
