import { CollisionSolving } from '../../models/index.js';

/**
 * These settings control the desired behaviour of {@link BlockAutomaticHandler}.
 * Unless decided within a command this will determine the default behaviour.
 *
 * So this will e.g. be used when a Homebridge-Hoffmation instance
 * e.g. issues a command to turn a light on as with this command no block
 * duration or behaviour is specified.
 */
export interface iBlockAutomaticHandlerDefaults {
  /**
   * Whether at Block-Lift the desired automatic state should be restored.
   */
  revertToAutomaticAtBlockLift?: boolean;

  /**
   * The default duration in milliseconds for a block to be on any force action.
   */
  blockAutomaticDurationMS?: number;

  /**
   * The default collision solving strategy to use.
   */
  defaultCollisionSolving?: CollisionSolving;
}
