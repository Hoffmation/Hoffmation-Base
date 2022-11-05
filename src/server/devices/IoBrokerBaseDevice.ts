import { iRoomDevice } from './baseDeviceInterfaces';
import { LogDebugType, ServerLogService, Utils } from '../services';
import { DeviceSettings, LogLevel, RoomAddDeviceItem, RoomBase, RoomDeviceAddingSettings } from '../../models';
import { IOBrokerConnection, ioBrokerMain } from '../ioBroker';
import { DeviceType } from './deviceType';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';
import { DeviceCapability } from './DeviceCapability';

export abstract class IoBrokerBaseDevice implements iRoomDevice {
  public settings: DeviceSettings | undefined = undefined;
  public static roomAddingSettings: { [id: string]: RoomDeviceAddingSettings } = {};
  public room: RoomBase | undefined = undefined;
  public readonly deviceCapabilities: DeviceCapability[] = [];
  protected readonly individualStateCallbacks: Map<string, Array<(val: ioBroker.StateValue) => void>> = new Map<
    string,
    Array<(val: ioBroker.StateValue) => void>
  >();

  protected constructor(protected _info: IoBrokerDeviceInfo, public deviceType: DeviceType) {
    this.addToCorrectRoom();
    this.persistDeviceInfo();
    this.loadDeviceSettings();
  }

  public get id(): string {
    const result: string = Utils.guard(this.info.allDevicesKey);
    if (result === '0' || result === '1') {
      ServerLogService.writeLog(
        LogLevel.Warn,
        `Device "${this.info.fullName}" has an akward allDevicesKey of "${result}"`,
      );
    }
    return result;
  }

  /**
   * Getter info
   * @return {IoBrokerDeviceInfo}
   */
  public get info(): IoBrokerDeviceInfo {
    return this._info;
  }

  /**
   * Setter info
   * @param {IoBrokerDeviceInfo} value
   */
  public set info(value: IoBrokerDeviceInfo) {
    this._info = value;
  }

  /**
   * Getter ioConn
   * @return {IOBrokerConnection}
   */
  public get ioConn(): IOBrokerConnection | undefined {
    return ioBrokerMain.iOConnection;
  }

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

  public loadDeviceSettings(): void {
    this.settings?.initializeFromDb(this);
  }

  /**
   * Allows to react on the state change of a given state with the passed cb
   * @param {string} stateName Last part of the id e.g. "available" not "zigbee.0.00158d00053d3e4b.available"
   * @param {(val: ioBroker.StateValue) => void} cb Desired Callback Action, with passed ioBroker.StateValue
   */
  public addIndividualStateCallback(stateName: string, cb: (val: ioBroker.StateValue) => void): void {
    let arr: Array<(val: ioBroker.StateValue) => void> | undefined = this.individualStateCallbacks.get(stateName);
    if (arr === undefined) {
      arr = [cb];
    } else {
      arr.push(cb);
    }
    this.individualStateCallbacks.set(stateName, arr);
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

  public log(level: LogLevel, message: string, logDebugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, message, {
      room: this.info.room,
      deviceId: this.id,
      deviceName: this.info.customName,
      debugType: logDebugType,
    });
  }

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return Utils.jsonFilter(this, ['individualStateCallbacks']);
  }

  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

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
