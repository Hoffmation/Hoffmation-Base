import { DeviceInfo, Devices, DeviceType, iTemporaryDisableAutomatic } from '../../devices';
import { CollisionSolving, LedSettings, LogLevel, RoomBase, TimeOfDay } from '../../../models';
import { LogDebugType, ServerLogService } from '../log-service';
import { Utils } from '../utils';
import _ from 'lodash';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { API } from '../api';
import { iLedRgbCct } from '../../devices/baseDeviceInterfaces/iLedRgbCct';
import { Device as GoveeDevice, DeviceState as GoveeDeviceState } from 'theimo1221-govee-lan-control';
import { BlockAutomaticHandler } from '../blockAutomaticHandler';
import { TimeCallbackService } from '../time-callback-service';

export class OwnGoveeDevice implements iLedRgbCct, iTemporaryDisableAutomatic {
  public settings: LedSettings = new LedSettings();
  public readonly deviceType: DeviceType = DeviceType.GoveeLed;
  public readonly deviceId: string;
  public readonly deviceCapabilities: DeviceCapability[] = [
    DeviceCapability.ledLamp,
    DeviceCapability.lamp,
    DeviceCapability.dimmablelamp,
    DeviceCapability.blockAutomatic,
  ];
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public on: boolean = false;
  public brightness: number = -1;

  public constructor(
    deviceId: string,
    ownDeviceName: string,
    roomName: string,
    public device: GoveeDevice | undefined,
  ) {
    this.deviceId = deviceId;
    this._info = new DeviceInfo();
    this._info.fullName = `Govee ${roomName} ${ownDeviceName}`;
    this._info.customName = `Govee ${ownDeviceName}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `govee-${roomName}-${deviceId}`;
    Devices.alLDevices[`govee-${roomName}-${deviceId}`] = this;
    this.persistDeviceInfo();
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
    Utils.guardedTimeout(this.loadDeviceSettings, 300, this);
  }

  private _color: string = '#fcba32';
  private _colortemp: number = 500;
  private _targetAutomaticState: boolean = false;
  private _room: RoomBase | undefined = undefined;

  public get color(): string {
    return this._color;
  }

  public get colortemp(): number {
    return this._colortemp;
  }

  public get customName(): string {
    return this.info.customName;
  }

  public get actuatorOn(): boolean {
    return this.on;
  }

  public get lightOn(): boolean {
    return this.on;
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  public get room(): RoomBase {
    if (this._room === undefined) {
      this._room = Utils.guard<RoomBase>(API.getRoom(this.info.room));
    }
    return this._room;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `govee-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this._room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<OwnGoveeDevice> {
    return Utils.jsonFilter(_.omit(this, ['room', 'device']));
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

  public loadDeviceSettings(): void {
    this.settings.initializeFromDb(this);
  }

  /**
   * @inheritDoc
   */
  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    switch (time) {
      case TimeOfDay.Night:
        if (this.settings.nightOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.nightBrightness,
            undefined,
            this.settings.nightColor,
            this.settings.nightColorTemp,
          );
        }
        break;
      case TimeOfDay.AfterSunset:
        if (this.settings.duskOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.duskBrightness,
            undefined,
            this.settings.duskColor,
            this.settings.duskColorTemp,
          );
        }
        break;
      case TimeOfDay.BeforeSunrise:
        if (this.settings.dawnOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.dawnBrightness,
            undefined,
            this.settings.dawnColor,
            this.settings.dawnColorTemp,
          );
        }
        break;
      case TimeOfDay.Daylight:
        if (this.settings.dayOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.dayBrightness,
            undefined,
            this.settings.dayColor,
            this.settings.dayColorTemp,
          );
        }
        break;
    }
  }

  /**
   * @inheritDoc
   */
  public setLight(
    pValue: boolean,
    timeout: number = -1,
    force?: boolean,
    brightness: number = -1,
    _transitionTime?: number,
    color: string = '',
    colorTemp: number = -1,
  ): void {
    if (pValue && brightness === -1 && this.brightness < 10) {
      brightness = 10;
    }
    this.log(
      LogLevel.Debug,
      `LED Schalten An: ${pValue}\tHelligkeit: ${brightness}%\tFarbe: "${color}"\tColorTemperatur: ${colorTemp}`,
    );

    const formattedColor: string | null = Utils.formatHex(color);
    if (formattedColor !== null) {
      this.setColor(color);
    }

    let dontBlock: boolean = false;
    if (
      force &&
      this.settings.resetToAutomaticOnForceOffAfterForceOn &&
      !pValue &&
      this.blockAutomationHandler.automaticBlockActive
    ) {
      dontBlock = true;
      this.log(LogLevel.Debug, `Reset Automatic Block as we are turning off manually after a force on`);
      this.blockAutomationHandler.liftAutomaticBlock();
    }

    if (!force && this.blockAutomationHandler.automaticBlockActive) {
      this.log(
        LogLevel.Debug,
        `Skip automatic command to ${pValue} as it is locked until ${new Date(
          this.blockAutomationHandler.automaticBlockedUntil,
        ).toLocaleTimeString()}`,
      );
      this._targetAutomaticState = pValue;
      return;
    }

    this.log(
      LogLevel.Debug,
      `Set Light Acutator to "${pValue}" with brightness ${brightness}`,
      LogDebugType.SetActuator,
    );
    if (brightness > -1 && pValue) {
      this.setBrightness(brightness, () => {
        this.log(LogLevel.Debug, `Brightness set to ${brightness}`);
        this.turnOn();
      });
    } else if (pValue) {
      this.turnOn();
    } else {
      this.turnOff();
    }
    if (timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public setActuator(pValue: boolean, timeout?: number, force?: boolean): void {
    this.setLight(pValue, timeout, force);
  }

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this._targetAutomaticState);
  }

  private setBrightness(brightness: number, cb: () => void): void {
    this.device?.actions
      .setBrightness(brightness)
      .then(() => {
        cb();
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Govee set brightness resulted in error: ${error}`);
      });
  }

  private setColor(color: string): void {
    if (color === this._color) {
      return;
    }
    this.device?.actions
      .setColor({ hex: color })
      .then(() => {
        this.log(LogLevel.Debug, `Govee set color to ${color}`, LogDebugType.SetActuator);
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Govee set color resulted in error: ${error}`);
      });
  }

  private turnOn(): void {
    if (this.on) {
      return;
    }
    this.device?.actions
      .setOn()
      .then(() => {
        this.log(LogLevel.Debug, `Govee turned on`, LogDebugType.SetActuator);
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Govee turn on resulted in error: ${error}`);
      });
  }

  private turnOff(): void {
    this.device?.actions
      .setOff()
      .then(() => {
        this.log(LogLevel.Debug, `Govee turned off`, LogDebugType.SetActuator);
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Govee turn off resulted in error: ${error}`);
      });
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public toggleActuator(_force: boolean): boolean {
    this.setLight(!this.on);
    return this.on;
  }

  public toggleLight(time?: TimeOfDay, _force: boolean = false, calculateTime: boolean = false): boolean {
    const newVal = !this.lightOn;
    if (newVal && time === undefined && calculateTime) {
      time = TimeCallbackService.dayType(this.room.settings.lampOffset);
    }
    if (newVal && time !== undefined) {
      this.setTimeBased(time);
      return true;
    }
    this.setLight(newVal);
    return newVal;
  }

  public update(data: GoveeDeviceState): void {
    this.on = data.isOn === 1;
    this.brightness = data.brightness;
    this._color = `#${data.color.r.toString(16)}${data.color.g.toString(16)}${data.color.b.toString(16)}`;
    this._colortemp = data.colorKelvin;
  }
}
