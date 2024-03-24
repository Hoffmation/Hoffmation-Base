import { LogLevel } from './logLevel';
import { LogDebugType } from '../server';

export interface iIdHolder {
  /**
   * The id of the object.
   * @warning This should be unique across all objects
   */
  readonly id: string;
  /**
   * The custom name of the object --> This can be a duplicate to other objects
   * This should be the human-readable name of the object.
   */
  readonly customName: string;

  /**
   * Logs a message for this idHolder
   * @param {LogLevel} level - The log level
   * @param {string} message - The message to log
   * @param {LogDebugType} logDebugType - If provided, this message will only be logged if the debug type is enabled in the settings
   */
  log(level: LogLevel, message: string, logDebugType?: LogDebugType): void;
}
