import { LogLevel } from './logLevel';

export interface iIdHolder {
  readonly id: string;
  readonly customName: string;

  log(level: LogLevel, message: string): void;
}
