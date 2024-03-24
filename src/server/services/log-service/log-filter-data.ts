import { LogSource } from '../../../models/logSource';
import { LogDebugType } from './log-debug-type';

export class LogFilterData {
  room?: string;
  deviceId?: string;
  deviceName?: string;
  groupType?: string;
  source?: LogSource;
  debugType?: LogDebugType = LogDebugType.None;
}
