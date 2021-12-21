import { ServerLogService } from '../services/log-service';
import { DeviceInfo } from './DeviceInfo';
import { RoomDeviceAddingSettings } from '../../models/rooms/RoomSettings/roomDeviceAddingSettings';
import { RoomAddDeviceItem } from '../../models/rooms/RoomSettings/roomAddDeviceItem';
import { IOBrokerConnection } from '../ioBroker/connection';
import { LogLevel } from '../../models/logLevel';
import { DeviceType } from './deviceType';
import { RoomBase } from '../../models/rooms/RoomBase';

export abstract class IoBrokerBaseDevice {
  public static roomAddingSettings: { [id: string]: RoomDeviceAddingSettings } = {};

  public static addRoom(shortName: string, settings: RoomDeviceAddingSettings): void {
    if (this.roomAddingSettings[shortName] !== undefined) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `Es gibt bereits ein Registrat für HmIpRoomsettings für den Raumnamen "${shortName}"`,
      );
      return;
    }
    this.roomAddingSettings[shortName] = settings;
  }

  public static checkMissing(): void {
    for (const rName in this.roomAddingSettings) {
      this.roomAddingSettings[rName].checkMissing();
    }
  }

  public room: RoomBase | undefined = undefined;
  public battery: number | undefined;

  public get id(): string {
    return this.info.devID;
  }
  protected _ioConnection?: IOBrokerConnection;

  protected constructor(protected _info: DeviceInfo, public deviceType: DeviceType) {
    this.addToCorrectRoom();
  }

  /**
   * Getter info
   * @return {TradFriInfo}
   */
  public get info(): DeviceInfo {
    return this._info;
  }

  /**
   * Setter info
   * @param {TradFriInfo} value
   */
  public set info(value: DeviceInfo) {
    this._info = value;
  }

  /**
   * Getter ioConn
   * @return {IOBrokerConnection}
   */
  public get ioConn(): IOBrokerConnection | undefined {
    return this._ioConnection;
  }

  /**
   * Setter ioConn
   * @param {IOBrokerConnection} value
   */
  public set ioConn(value: IOBrokerConnection | undefined) {
    this._ioConnection = value;
  }

  /**
   * Returns whether a connection to ioBroker is established or not
   * @param showError If true, an error message will be written to the log if the connection is not established
   */
  public checkIoConnection(showError: boolean = false): boolean {
    if (!this.ioConn && showError) {
      ServerLogService.writeLog(LogLevel.Error, `No connection active for "${this.info.customName}".`);
    }

    return this.ioConn !== undefined;
  }

  public abstract update(idSplit: string[], state: ioBroker.State, initial: boolean, pOverride: boolean): void;

  protected addToCorrectRoom(): void {
    const settings: RoomDeviceAddingSettings | undefined = IoBrokerBaseDevice.roomAddingSettings[this.info.room];
    if (settings !== undefined) {
      if (settings.devices[this.deviceType] === undefined) {
        ServerLogService.missingRoomHandling(settings.RoomName, this.deviceType);
        return;
      }
      const deviceSettings: RoomAddDeviceItem | undefined =
        settings.devices[this.deviceType][this.info.deviceRoomIndex];
      if (deviceSettings === undefined) {
        ServerLogService.missingRoomIndexHandling(settings.RoomName, this.info.deviceRoomIndex, this.deviceType);
        return;
      }

      if (deviceSettings.customName !== undefined) {
        this.info.customName = deviceSettings.customName;
      }
      if (this.info.allDevicesKey === undefined) {
        ServerLogService.writeLog(
          LogLevel.Error,
          `AllDevicesKey for Device "${this.info.fullName}"/"${this.info.fullID}" missing.`,
        );
        return;
      }
      this.room = deviceSettings.setID(this.info.allDevicesKey);
      deviceSettings.added = true;
      ServerLogService.addedDeviceToRoom(settings.RoomName, this.deviceType, this.info.deviceRoomIndex);
      return;
    }

    ServerLogService.writeLog(LogLevel.Warn, `${this.info.room} is noch kein bekannter Raum`);
  }

  /**
   * Sets the state of a given data point and returns true if that was successful.
   * @param pointId Data point to write to
   * @param state Data to write
   * @param onSuccess Callback to run on successfully written data
   * @param onError Callback to run if an error has occurred during writing the data
   */
  protected setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    onSuccess: (() => void) | undefined = undefined,
    onError: ((error: Error) => void) | undefined = undefined,
  ): void {
    if (!this.checkIoConnection(true)) {
      return;
    }

    this.ioConn?.setState(pointId, state, (err) => {
      if (err) {
        if (onError) {
          onError(err);
        } else {
          console.log(`Error occured while setting state "${pointId}" to "${state}": ${err}`);
        }

        return;
      }

      if (onSuccess) {
        onSuccess();
      }
    });
  }
}
