import { LogLevel } from './logLevel';
import { LogDebugType } from '../server';

export interface iIdHolder {
  readonly id: string;
  readonly customName: string;

  log(level: LogLevel, message: string, logDebugType?: LogDebugType): void;
}
