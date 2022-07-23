import { GroupType } from './group-type';
import { DeviceCluster } from '../device-cluster';
import { LogLevel, RoomBase } from '../../../models';
import { API, LogDebugType, ServerLogService, Utils } from '../../services';

export class BaseGroup {
  public constructor(public roomName: string, public type: GroupType) {}

  protected _deviceCluster: DeviceCluster = new DeviceCluster();

  public get deviceCluster(): DeviceCluster {
    return this._deviceCluster;
  }

  public getRoom(): RoomBase {
    return Utils.guard<RoomBase>(API.getRoom(this.roomName));
  }

  protected log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
      groupType: GroupType[this.type],
      debugType: debugType,
    });
  }
}
