import { LogLevel } from 'index';
import { DeviceType } from 'index';
import { IOBrokerConnection } from 'index';
import { ServerLogService } from 'index';
import { IoBrokerBaseDevice } from 'index';
import { HmIPDevice } from 'index';
import { ZigbeeDevice } from 'index';
import { DeviceInfo } from 'index';
import { HmIpPraezenz } from 'index';
import { deviceConfig } from 'index';
import { HmIpBewegung } from 'index';
import { iRoomImportEnforcer } from 'index';

export class Devices {
  public static IDENTIFIER_HOMEMATIC: string = 'hm-rpc';
  public static IDENTIFIER_ZIGBEE: string = 'zigbee';
  public static alLDevices: { [id: string]: IoBrokerBaseDevice } = {};

  public constructor(pDeviceData: { [id: string]: deviceConfig }, pRoomImportEnforcer: iRoomImportEnforcer) {
    // This forces import of rooms at correct timing, to allow devices to land in proper rooms.
    pRoomImportEnforcer.addRoomConstructor();

    for (const cID in pDeviceData) {
      const cDevConf: deviceConfig = pDeviceData[cID];
      if (
        !cDevConf.common ||
        !cDevConf.common.name ||
        typeof cDevConf.common.name === 'object' ||
        !cDevConf.type ||
        cDevConf.type === 'channel'
      ) {
        continue;
      }

      const cName: string = cDevConf.common.name;

      if (cName.indexOf('00-HmIP') === 0) {
        this.processHMIPDevice(cDevConf);
      } else if (cName.indexOf('00-Zigbee') === 0) {
        this.processZigbeeDevice(cDevConf);
      }
    }

    HmIPDevice.checkMissing();
    ZigbeeDevice.checkMissing();
  }

  public static addIoConnection(pIoConnection: IOBrokerConnection): void {
    for (const id in Devices.alLDevices) {
      Devices.alLDevices[id].ioConn = pIoConnection;
    }
  }

  public static midnightReset(): void {
    // Nothing yet
  }

  public static resetPraesenzCount(): void {
    ServerLogService.writeLog(LogLevel.Info, `3 Uhr Reset der Präsenzmelder`);
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpPraezenz) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as HmIpPraezenz).detectionsToday = 0;
      } else if (d.deviceType === DeviceType.HmIpBewegung) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as HmIpBewegung).detectionsToday = 0;
      }
    }
  }

  private processZigbeeDevice(cDevConf: deviceConfig) {
    const zigbeeInfo: DeviceInfo = new DeviceInfo(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_ZIGBEE}-${zigbeeInfo.devID}`;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `${zigbeeInfo.devID} with Type "${zigbeeInfo.deviceType}" doesn't exists --> create it`,
    );
    Devices.alLDevices[fullName] = ZigbeeDevice.createRespectiveDevice(zigbeeInfo);
    Devices.alLDevices[fullName].allDevicesKey = fullName;
  }

  private processHMIPDevice(cDevConf: deviceConfig) {
    const hmIPInfo: DeviceInfo = new DeviceInfo(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_HOMEMATIC}-${hmIPInfo.devID}`;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }
    ServerLogService.writeLog(
      LogLevel.Trace,
      `${hmIPInfo.devID} with Type "${hmIPInfo.deviceType}" doesn't exists --> create it`,
    );
    const d: HmIPDevice = HmIPDevice.createRespectiveDevice(hmIPInfo);
    Devices.alLDevices[fullName] = d;
    Devices.alLDevices[fullName].allDevicesKey = fullName;
  }
}
