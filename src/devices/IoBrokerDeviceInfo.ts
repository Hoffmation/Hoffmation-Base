/* eslint-disable jsdoc/require-jsdoc */
import _ from 'lodash';
import { iDeviceConfig } from '../interfaces/iDeviceConfig';
import { DeviceInfo } from './DeviceInfo';
import { iIoBrokerDeviceInfo } from '../interfaces';

export class IoBrokerDeviceInfo extends DeviceInfo implements iIoBrokerDeviceInfo {
  public devID: string;
  public deviceType: string;
  public deviceRoomIndex: number;
  public type: 'device' | 'channel' | 'state';
  public fullID: string;
  public devConf: iDeviceConfig;

  public static idSplitter(id: string): string[] {
    const split = id.split('.');
    if (split[2] !== undefined) {
      split[2] = this.replaceInvalidIdChars(split[2]);
    }
    return split;
  }

  private static replaceInvalidIdChars(idPart: string): string {
    return idPart.replace(/[#\-]/g, '_');
  }

  /**
   * Extracts the relevant infos from the passed deviceConfig and combines them in a new Info object
   * @param pDevConf - The device Config based on the extracted devices.json from ioBroker
   * @param deviceId - The id of the device
   * @param deviceType - The type of the device
   * @param room - The room id of the device
   * @param deviceRoomIndex - Index of this device in regards to the devicetype.
   */
  public constructor(
    pDevConf: iDeviceConfig,
    deviceId: string,
    deviceType: string,
    room: string,
    deviceRoomIndex: number,
  ) {
    super();
    this.devConf = pDevConf;
    this.type = pDevConf.type as 'device' | 'channel' | 'state';
    this.fullID = pDevConf._id;
    this.devID = deviceId;
    this.fullName = pDevConf.common!.name as string;
    this.deviceType = deviceType;
    this.deviceRoomIndex = deviceRoomIndex;
    this.room = room;
  }

  public static byStateJsSplit(pDevConf: iDeviceConfig): IoBrokerDeviceInfo {
    const nameSplit: string[] = (pDevConf.common!.name as string).split('-');
    const idSplit: string[] = IoBrokerDeviceInfo.idSplitter(pDevConf._id);
    /**
     * Name-Split
     * 0: Indikator own "00"
     * 1: "EnergyManager"
     * 2: Raum
     * 3: Was für ein Gerät
     * 4: Index dieses Gerätes im Raum (ggf. + :Channel)
     * 5?: Name des Wertes
     */
    const deviceType = nameSplit[1];
    const room = nameSplit.length >= 3 ? nameSplit[2] : '';
    const deviceRoomIndex = nameSplit.length >= 4 ? Number(nameSplit[3]) : 0;
    return new IoBrokerDeviceInfo(pDevConf, idSplit[2], deviceType, room, deviceRoomIndex);
  }

  public static byDeviceConfig(pDevConf: iDeviceConfig): IoBrokerDeviceInfo {
    const nameSplit: string[] = (pDevConf.common!.name as string).split('-');
    const idSplit: string[] = IoBrokerDeviceInfo.idSplitter(pDevConf._id);
    /**
     * 0: hm-rpc
     * 1: rcpInstance
     * 2: Device ID
     * 3?: Channel
     * 4?: ValueName
     */
    /**
     * Name-Split
     * 0: Indikator own "00"
     * 1: "HmIP"
     * 2: Raum
     * 3: Was für ein Gerät
     * 4: Index dieses Gerätes im Raum (ggf. + : Channel)
     * 5?: Name des Wertes
     */

    const room = nameSplit[2];
    const deviceType = nameSplit[3];
    const deviceRoomIndex: number = Number(nameSplit[4].split(':')[0]);
    return new IoBrokerDeviceInfo(pDevConf, idSplit[2], deviceType, room, deviceRoomIndex);
  }

  public override toJSON(): Partial<IoBrokerDeviceInfo> {
    return _.omit(this, ['devConf']);
  }
}
