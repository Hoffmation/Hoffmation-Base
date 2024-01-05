import { DeviceInfo, Devices, DeviceType, iTemporaryDisableAutomatic, LampUtils } from '../../devices';
import { CollisionSolving, LedSettings, LogLevel, RoomBase, TimeOfDay } from '../../../models';
import { LogDebugType, ServerLogService } from '../log-service';
import { Utils } from '../utils';
import _ from 'lodash';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { API } from '../api';
import { iLedRgbCct } from '../../devices/baseDeviceInterfaces/iLedRgbCct';
import { Device as GoveeDevice, DeviceStateInfo as GoveeDeviceStateInfo } from '@j3lte/govee-lan-controller';
import { BlockAutomaticHandler } from '../blockAutomaticHandler';
import { DeviceState as GoveeDeviceState } from '@j3lte/govee-lan-controller/build/types/device';

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
  public queuedValue: boolean | null = null;
  public brightness: number = -1;
  public targetAutomaticState: boolean = false;

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

  public get color(): string {
    return this._color;
  }

  private _colortemp: number = 500;

  public get colortemp(): number {
    return this._colortemp;
  }

  private _room: RoomBase | undefined = undefined;

  public get room(): RoomBase {
    if (this._room === undefined) {
      this._room = Utils.guard<RoomBase>(API.getRoom(this.info.room));
    }
    return this._room;
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

    const dontBlock: boolean = LampUtils.checkUnBlock(this, force, pValue);

    if (LampUtils.checkBlockActive(this, force, pValue)) {
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
    this.setActuator(this.targetAutomaticState);
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public toggleActuator(_force: boolean): boolean {
    this.setLight(!this.on);
    return this.on;
  }

  public toggleLight(time?: TimeOfDay, _force: boolean = false, calculateTime: boolean = false): boolean {
    return LampUtils.toggleLight(this, time, _force, calculateTime);
  }

  public update(data: GoveeDeviceState & GoveeDeviceStateInfo): void {
    this.queuedValue = null;
    this.on = data.onOff === 1;
    this.brightness = data.brightness;
    this._color = `#${data.color.r.toString(16)}${data.color.g.toString(16)}${data.color.b.toString(16)}`;
    this._colortemp = data.colorTemInKelvin;
  }

  private setBrightness(brightness: number, cb: () => void): void {
    this.device
      ?.setBrightness(brightness)
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
    const colors: { r: number; g: number; b: number } | null = Utils.hexToRgb(color);
    if (colors === null) {
      this.log(LogLevel.Error, `Govee set color resulted in error: ${color} is not a valid color`);
      return;
    }
    this.device
      ?.setColorRGB(colors)
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
    this.queuedValue = true;
    this.device
      ?.turnOn()
      .then(() => {
        this.log(LogLevel.Debug, `Govee turned on`, LogDebugType.SetActuator);
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Govee turn on resulted in error: ${error}`);
      });
  }

  private turnOff(): void {
    this.queuedValue = false;
    this.device
      ?.turnOff()
      .then(() => {
        this.log(LogLevel.Debug, `Govee turned off`, LogDebugType.SetActuator);
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Govee turn off resulted in error: ${error}`);
      });
  }
}
