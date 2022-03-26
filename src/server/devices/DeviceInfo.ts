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

  /**
   * Extracts the relevant infos from the passed deviceConfig and combines them in a new Info object
   * @param {deviceConfig} pDevConf The device Config based on the extracted devices.json from ioBroker
   * @param {boolean} isJsStateChildObject Within JS Objects, creating devices is limited,
   * so we name the first child state for the object creation (e.g. javascript.0.00-EnergyManager.CurrentProduction)
   */
  public constructor(pDevConf: deviceConfig, isJsStateChildObject: boolean = false) {
    this.devConf = pDevConf;
    this.type = pDevConf.type as 'device' | 'channel' | 'state';

    const idSplit: string[] = pDevConf._id.split('.');
    this.fullID = pDevConf._id;
    this.devID = idSplit[2];
    this.fullName = pDevConf.common.name;
    const nameSplit: string[] = pDevConf.common.name.split('-');

    if (!isJsStateChildObject) {
      /**
       * 0: hm-rpc
       * 1: rcpInstance
       * 2: Device ID
       * 3?: Channel
       * 4?: ValueName
       */

      if (idSplit.length > 3) {
        this.channel = Number(idSplit[3]);
      }

      if (idSplit.length > 4) {
        this.valueName = idSplit[4];
      }
      /** Name-Split
       * 0: Indikator own "00"
       * 1: "HmIP"
       * 2: Raum
       * 3: Was für ein Gerät
       * 4: Index dieses Gerätes im Raum (ggf. + :Channel)
       * 5?: Name des Wertes
       */

      this.room = nameSplit[2];
      this.deviceType = nameSplit[3];
      this.deviceRoomIndex = Number(nameSplit[4].split(':')[0]);
      return;
    } else {
      /** Name-Split
       * 0: Indikator own "00"
       * 1: "EnergyManager"
       * 2: Raum
       * 3: Was für ein Gerät
       * 4: Index dieses Gerätes im Raum (ggf. + :Channel)
       * 5?: Name des Wertes
       */
      this.deviceType = nameSplit[1];
      this.room = nameSplit.length >= 3 ? nameSplit[2] : '';
      this.deviceRoomIndex = nameSplit.length >= 4 ? Number(nameSplit[3]) : 0;
    }
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
