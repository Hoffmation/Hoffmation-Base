import { iIdHolder } from '../iIdHolder';
import { iGroupSettings } from '../settings';
import { GroupType, LogDebugType, LogLevel } from '../../enums';
import { iDeviceCluster } from '../iDevicecluster';
import { iRoomBase } from '../iRoomBase';

/**
 *
 */
export interface iBaseGroup extends iIdHolder {
  /**
   *
   */
  settings: iGroupSettings | undefined;
  /**
   *
   */
  readonly customName: string;
  /**
   *
   */
  roomName: string;
  /**
   *
   */
  type: GroupType;
  /**
   *
   */
  readonly deviceCluster: iDeviceCluster;

  /**
   *
   */
  getRoom(): iRoomBase;

  /**
   *
   */
  log(level: LogLevel, message: string, debugType: LogDebugType): void;
}
