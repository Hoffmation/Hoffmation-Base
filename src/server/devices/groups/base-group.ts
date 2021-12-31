import { GroupType } from './group-type';
import { DeviceCluster } from '../device-cluster';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { API } from '../../services/api/api-service';
import { Utils } from '../../services/utils/utils';
import { LogLevel } from '../../../models/logLevel';
import { ServerLogService } from '../../services/log-service/log-service';

export class BaseGroup {
  protected _deviceCluster: DeviceCluster = new DeviceCluster();
  public get deviceCluster(): DeviceCluster {
    return this._deviceCluster;
  }
  public constructor(public roomName: string, public type: GroupType) {}

  public getRoom(): RoomBase {
    return Utils.guard<RoomBase>(API.getRoom(this.roomName));
  }

  protected log(level: LogLevel, message: string): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
      groupType: GroupType[this.type],
    });
  }
}
