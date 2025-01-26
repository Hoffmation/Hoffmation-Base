import { CommandSource, CommandType } from '../enums';

/**
 *
 */
export interface iBaseCommand {
  /**
   *
   */
  timestamp: Date;
  /**
   *
   */
  type: CommandType;
  /**
   *
   */
  overrideCommandSource: CommandSource | undefined;
  /**
   *
   */
  readonly source: CommandSource | iBaseCommand;
  /**
   *
   */
  readonly reason: string;
  /**
   *
   */
  ignoreReason?: string;
  /**
   *
   */
  readonly isAutomaticAction: boolean;
  /**
   *
   */
  readonly isForceAction: boolean;
  /**
   *
   */
  readonly isManual: boolean;
  /**
   *
   */
  readonly isInitial: boolean;
  /**
   *
   */
  readonly reasonTrace: string;

  /**
   *
   */
  readonly logMessage: string;

  /**
   *
   */
  containsType(type: CommandType): boolean;
}
