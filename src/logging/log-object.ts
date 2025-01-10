import { LogFilterData } from './log-filter-data';
import { LogLevel } from './logLevel';

export class LogObject {
  public constructor(
    public time: number,
    public level: LogLevel,
    public message: string,
    public additionalData?: LogFilterData,
  ) {}
}
