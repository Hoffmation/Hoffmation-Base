import { LogLevel } from '../enums';
import { LogFilterData } from './log-filter-data';

export class LogObject {
  public constructor(
    public time: number,
    public level: LogLevel,
    public message: string,
    public additionalData?: LogFilterData,
  ) {}
}
