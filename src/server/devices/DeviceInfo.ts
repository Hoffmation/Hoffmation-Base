import { deviceConfig } from '../../models/deviceConfig';
import _ from 'lodash';

export class DeviceInfo {
  public devID: string;
  public room: string;
  public deviceType: string;
  public deviceRoomIndex: number;
  public type: 'device' | 'channel' | 'state';
  public fullName: string;
  private _customName?: string;
  public fullID: string;
  public channel?: number;
  public valueName?: string;
  public devConf: deviceConfig;
  public allDevicesKey?: string;

  public constructor(pDevConf: deviceConfig) {
    this.devConf = pDevConf;
    this.type = pDevConf.type as 'device' | 'channel' | 'state';

    this.fullID = pDevConf._id;
    /**
     * 0: hm-rpc
     * 1: rcpInstance
     * 2: Device ID
     * 3?: Channel
     * 4?: ValueName
     */
    const idSplit: string[] = pDevConf._id.split('.');
    this.devID = idSplit[2];

    if (idSplit.length > 3) {
      this.channel = Number(idSplit[3]);
    }

    if (idSplit.length > 4) {
      this.valueName = idSplit[4];
    }

    this.fullName = pDevConf.common.name;
    /**
     * 0: Indikator own "00"
     * 1: "HmIP"
     * 2: Raum
     * 3: Was für ein Gerät
     * 4: Index dieses Gerätes im Raum (ggf. + :Channel)
     * 5?: Name des Wertes
     */
    const nameSplit: string[] = pDevConf.common.name.split('-');

    this.room = nameSplit[2];
    this.deviceType = nameSplit[3];
    this.deviceRoomIndex = Number(nameSplit[4].split(':')[0]);
  }

  public set customName(val: string) {
    this._customName = val;
  }

  public get customName(): string {
    if (this._customName !== undefined) {
      return this._customName;
    }

    return this.fullName;
  }

  public toJSON(): Partial<DeviceInfo> {
    return _.omit(this, ['devConf']);
  }
}
