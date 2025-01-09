import { GroupType } from './group-type.js';
import { DeviceCluster } from '../device-cluster.js';
import { LogLevel, RoomBase } from '../../../models/index.js';
import { API, LogDebugType, ServerLogService, Utils } from '../../services/index.js';
import { iIdHolder } from '../../../models/iIdHolder.js';
import { GroupSettings } from '../../../models/groupSettings/groupSettings.js';

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
