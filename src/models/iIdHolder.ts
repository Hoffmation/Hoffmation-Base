import { LogLevel } from './logLevel';
import { LogDebugType } from '../server';

export interface iIdHolder {
  readonly id: string;
  readonly customName: string;

  /**
   * Logs a message for this idHolder
   * @param {LogLevel} level - The log level
   * @param {string} message - The message to log
   * @param {LogDebugType} logDebugType - If provided, this message will only be logged if the debug type is enabled in the settings
   */
  log(level: LogLevel, message: string, logDebugType?: LogDebugType): void;
}
