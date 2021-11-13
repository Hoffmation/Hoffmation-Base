import { LogLevel } from '../../../models/logLevel';
import { DeviceInfo } from '../DeviceInfo';
import { HmIpDeviceType } from './hmIpDeviceType';
import { HmIpAddDeviceItem, HmIpRoomSettings } from '../../../models/rooms/RoomSettings/hmIPRoomSettings';
import { ServerLogService } from '../../services/log-service';
import { ioBrokerBaseDevice } from '../iIoBrokerDevice';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class HmIPDevice extends ioBrokerBaseDevice {
  public static roomSettings: { [id: string]: HmIpRoomSettings } = {};
  public lowBattery: boolean = false;
  public deviceType: HmIpDeviceType;
  public room: RoomBase | undefined = undefined;

  public static addRoom(shortName: string, settings: HmIpRoomSettings): void {
    if (this.roomSettings[shortName] !== undefined) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `Es gibt bereits ein Registrat für HmIpRoomsettings für den Raumnamen "${shortName}"`,
      );
      return;
    }
    this.roomSettings[shortName] = settings;
  }

  public static checkMissing(): void {
    for (const rName in this.roomSettings) {
      this.roomSettings[rName].checkMissing();
    }
  }

  public constructor(pInfo: DeviceInfo, pType: HmIpDeviceType) {
    super(pInfo);
    this.deviceType = pType;
    this.addToCorrectRoom();
  }

  protected addToCorrectRoom(): void {
    const settings: HmIpRoomSettings | undefined = HmIPDevice.roomSettings[this.info.room];
    if (settings !== undefined) {
      if (settings.devices[this.deviceType] === undefined) {
        ServerLogService.missingRoomHandling(settings.RoomName, this.deviceType);
        return;
      }
      const deviceSettings: HmIpAddDeviceItem | undefined =
        settings.devices[this.deviceType][this.info.deviceRoomIndex];
      if (deviceSettings === undefined) {
        ServerLogService.missingRoomIndexHandling(settings.RoomName, this.info.deviceRoomIndex, this.deviceType);
        return;
      }

      if (deviceSettings.customName !== undefined) {
        this.info.customName = deviceSettings.customName;
      }
      deviceSettings.setID(this.info.devID);
      deviceSettings.added = true;
      ServerLogService.addedDeviceToRoom(settings.RoomName, this.deviceType, this.info.deviceRoomIndex);
      return;
    }
    switch (this.info.room) {
      default:
        ServerLogService.writeLog(LogLevel.Warn, `${this.info.room} is noch kein bekannter Raum`);
    }
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    if (!pOverride) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Keine Update Überschreibung für "${this.info.customName}":\n\tID: ${idSplit.join(
          '.',
        )}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    if (idSplit[3] !== '0') {
      // Dies ist etwas Gerätespezifisches
      return;
    }

    switch (idSplit[4]) {
      case 'LOW_BAT':
        const newBatLowVal: boolean = state.val as boolean;
        if (newBatLowVal) {
          ServerLogService.writeLog(LogLevel.Alert, `!!BATTERIE FAST LEER!! "${this.info.customName}"`);
        }
        break;
    }
  }
}
