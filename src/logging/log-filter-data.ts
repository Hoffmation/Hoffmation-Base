import { LogDebugType } from './log-debug-type';
import { LogSource } from './logSource';

export class LogFilterData {
  /**
   * If given, the room this log-item is related to
   */
  room?: string;
  /**
   * If given, the device this log-item is related to identified by its ID
   */
  deviceId?: string;
  /**
   * If given, the name of the device this log-item is related to
   */
  deviceName?: string;
  /**
   * If given, the group this log-item can be associated with
   * @example WindowGroup
   */
  groupType?: string;
  /**
   * If given, a source identifying the origin of the log-item
   * TODO: Add further sources
   */
  source?: LogSource;
  /**
   * If given, the debug-type which in accordance to {@link iLogSettings} might result in this being filtered out
   */
  debugType?: LogDebugType = LogDebugType.None;
}
