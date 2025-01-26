import { iDeviceInfo, iRoomBase, iRoomDevice } from '../interfaces';
import { DeviceType } from '../enums';
import { Utils } from '../utils';
import { API } from '../api';
import { BaseDevice } from './BaseDevice';

export abstract class RoomBaseDevice extends BaseDevice implements iRoomDevice {
  protected _room: iRoomBase | undefined = undefined;

  protected constructor(info: iDeviceInfo, type: DeviceType) {
    super(info, type);
    this.jsonOmitKeys.push('_room');
  }

  /** @inheritDoc */
  public get room(): iRoomBase {
    if (this._room === undefined) {
      this._room = Utils.guard<iRoomBase>(API.getRoom(this.info.room));
    }
    return this._room;
  }
}
