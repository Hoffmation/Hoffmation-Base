import { iIdHolder, iRoomBase } from '../../interfaces';
import { GroupSettings } from '../../models';
import { GroupType, LogDebugType, LogLevel } from '../../enums';
import { DeviceCluster } from '../device-cluster';
import { Utils } from '../../utils';
import { API } from '../../api';
import { ServerLogService } from '../../logging';

export class BaseGroup implements iIdHolder {
  /**
   * The settings of the group
   */
  public settings: GroupSettings | undefined = undefined;

  public get customName(): string {
    return `${GroupType[this.type]} ${this.getRoom().customName}`;
  }

  /** @inheritDoc */
  public id: string;

  public constructor(
    public roomName: string,
    public type: GroupType,
  ) {
    this.id = `${this.roomName}-${GroupType[this.type]}`;
  }

  protected _deviceCluster: DeviceCluster = new DeviceCluster();

  public get deviceCluster(): DeviceCluster {
    return this._deviceCluster;
  }

  public getRoom(): iRoomBase {
    return Utils.guard<iRoomBase>(API.getRoom(this.roomName));
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
      groupType: GroupType[this.type],
      debugType: debugType,
    });
  }
}
