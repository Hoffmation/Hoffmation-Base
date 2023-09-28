import { GroupType } from './group-type';
import { DeviceCluster } from '../device-cluster';
import { LogLevel, RoomBase } from '../../../models';
import { API, LogDebugType, ServerLogService, Utils } from '../../services';
import { iIdHolder } from '../../../models/iIdHolder';
import { GroupSettings } from '../../../models/groupSettings/groupSettings';

export class BaseGroup implements iIdHolder {
  public settings: GroupSettings | undefined = undefined;

  public get customName(): string {
    return `${GroupType[this.type]} ${this.getRoom().customName}`;
  }

  public get id(): string {
    return `${this.roomName}-${GroupType[this.type]}`;
  }

  public constructor(
    public roomName: string,
    public type: GroupType,
  ) {}

  protected _deviceCluster: DeviceCluster = new DeviceCluster();

  public get deviceCluster(): DeviceCluster {
    return this._deviceCluster;
  }

  public getRoom(): RoomBase {
    return Utils.guard<RoomBase>(API.getRoom(this.roomName));
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
      groupType: GroupType[this.type],
      debugType: debugType,
    });
  }
}
