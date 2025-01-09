import { LogLevel } from '../../../models/index.js';
import { LogFilterData } from './log-filter-data.js';

export class LogObject {
  public constructor(
    public time: number,
    public level: LogLevel,
    public message: string,
    public additionalData?: LogFilterData,
  ) {}
}
