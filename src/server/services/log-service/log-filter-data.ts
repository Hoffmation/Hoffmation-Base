import { LogSource } from '../../../models/logSource';

export class LogFilterData {
  room?: string;
  deviceId?: string;
  deviceName?: string;
  groupType?: string;
  source?: LogSource;
}
