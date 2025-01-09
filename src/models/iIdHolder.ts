import { LogLevel } from './logLevel.js';
import { LogDebugType } from '../server/index.js';

/**
 * Interface for objects that have an unique id and a custom name
 * The id can be used for API interaction, storing settings to the database, etc.
 */
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
   * @param level - The log level
   * @param message - The message to log
   * @param logDebugType - If provided, this message will only be logged if the debug type is enabled in the settings
   */
  log(level: LogLevel, message: string, logDebugType?: LogDebugType): void;
}
