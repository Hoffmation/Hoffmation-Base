import { CollisionSolving } from '../../enums';
import { BlockAutomaticSettings } from '../../models';

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
  fromPartialObject(obj: Partial<BlockAutomaticSettings>): void;
}
