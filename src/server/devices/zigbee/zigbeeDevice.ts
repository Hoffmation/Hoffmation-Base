import { ZigbeeDeviceType } from './zigbeeDeviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';
import { ZigbeeAddDeviceItem, ZigbeeRoomSettings } from '../../../models/rooms/RoomSettings/zigbeeRoomSettings';
import { ServerLogService } from '../../services/log-service';
import { ioBrokerBaseDevice } from '../iIoBrokerDevice';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class ZigbeeDevice extends ioBrokerBaseDevice {
  private static roomSettings: { [id: string]: ZigbeeRoomSettings } = {};
  public room: RoomBase | undefined = undefined;
  public deviceType: ZigbeeDeviceType;
  public available: boolean = false;
  public linkQuality: number = 0;
  public battery: number = -1;
  public voltage: string = '';

  public static addRoom(shortName: string, settings: ZigbeeRoomSettings): void {
    if (this.roomSettings[shortName] !== undefined) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `Es gibt bereits ein Registrat für ZigbeeRoomsettings für den Raumnamen "${shortName}"`,
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

  public constructor(pInfo: DeviceInfo, pType: ZigbeeDeviceType) {
    super(pInfo);
    this.deviceType = pType;
    this.addToCorrectRoom();
  }

  protected addToCorrectRoom(): void {
    const settings: ZigbeeRoomSettings | undefined = ZigbeeDevice.roomSettings[this.info.room];
    if (settings !== undefined) {
      if (settings.devices[this.deviceType] === undefined) {
        ServerLogService.missingZigbeeRoomHandling(settings.RoomName, this.deviceType);
        return;
      }
      const deviceSettings: ZigbeeAddDeviceItem | undefined =
        settings.devices[this.deviceType][this.info.deviceRoomIndex];
      if (deviceSettings === undefined) {
        ServerLogService.missingZigbeeRoomIndexHandling(settings.RoomName, this.info.deviceRoomIndex, this.deviceType);
        return;
      }

      if (deviceSettings.customName !== undefined) {
        this.info.customName = deviceSettings.customName;
      }
      deviceSettings.setID(this.info.devID);
      deviceSettings.added = true;
      ServerLogService.addedZigbeeDeviceToRoom(settings.RoomName, this.deviceType, this.info.deviceRoomIndex);
      return;
    }
    ServerLogService.writeLog(LogLevel.Warn, `${this.info.room} ist noch kein bekannter Raum für Zigbee Geräte`);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Zigbee: ${initial ? 'Initiales ' : ''}Update für "${this.info.customName}": ID: ${idSplit.join(
        '.',
      )} JSON: ${JSON.stringify(state)}`,
    );
    if (!pOverride) {
      ServerLogService.writeLog(
        LogLevel.Warn,
        `Keine Update Überschreibung für "${this.info.customName}":\n\tID: ${idSplit.join(
          '.',
        )}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    switch (idSplit[3]) {
      case 'available':
        this.available = state.val as boolean;
        if (!this.available) {
          ServerLogService.writeLog(
            LogLevel.Debug,
            `Das Zigbee Gerät mit dem Namen "${this.info.customName}" ist nicht erreichbar.`,
          );
        }
        break;
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          ServerLogService.writeLog(
            LogLevel.Alert,
            `Das Zigbee Gerät mit dem Namen "${this.info.customName}" hat unter 20% Batterie.`,
          );
        }
        break;

      case 'link_quality':
        this.linkQuality = state.val as number;
        if (this.linkQuality < 5) {
          ServerLogService.writeLog(
            LogLevel.Debug,
            `Das Zigbee Gerät mit dem Namen "${this.info.customName}" hat eine schlechte Verbindung (${this.linkQuality}).`,
          );
        }
        break;

      case 'voltage':
        this.voltage = state.val as string;
        break;
    }
  }
}
