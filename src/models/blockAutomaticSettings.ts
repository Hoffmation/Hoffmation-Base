import { CollisionSolving } from './collisionSolving.js';

export class BlockAutomaticSettings {
  /**
   * The duration in ms at which the automatic block should be disabled on force actions.
   * If not set {@link iBlockAutomaticHandlerDefaults.blockAutomaticDurationMS} will be used.
   */
  public blockAutomaticDurationMS?: number;

  /**
   * If set to true, the automatic won't be blocked on force Action (unless explicitly provided).
   */
  public dontBlockAutomaticIfNotProvided?: boolean = false;

  /**
   * The collision solving strategy to use
   * If not set {@link iBlockAutomaticHandlerDefaults.defaultCollisionSolving} will be used.
   */
  public defaultCollisionSolving?: CollisionSolving;

  /**
   * If set to true, the automatic will be reverted to the automatic state when the block is lifted.
   * If not set {@link iBlockAutomaticHandlerDefaults.revertToAutomaticAtBlockLift} will be used.
   */
  public revertToAutomaticAtBlockLift?: boolean;

  public fromPartialObject(obj: Partial<BlockAutomaticSettings>): void {
    this.blockAutomaticDurationMS = obj.blockAutomaticDurationMS ?? this.blockAutomaticDurationMS;
    this.dontBlockAutomaticIfNotProvided = obj.dontBlockAutomaticIfNotProvided ?? this.dontBlockAutomaticIfNotProvided;
    this.defaultCollisionSolving = obj.defaultCollisionSolving ?? this.defaultCollisionSolving;
    this.revertToAutomaticAtBlockLift = obj.revertToAutomaticAtBlockLift ?? this.revertToAutomaticAtBlockLift;
  }
}
