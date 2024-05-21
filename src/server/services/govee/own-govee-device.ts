import { DeviceInfo, Devices, DeviceType, iTemporaryDisableAutomatic, LampUtils } from '../../devices';
import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LedSetLightCommand,
  LedSettings,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
  RoomBase,
} from '../../../models';
import { LogDebugType, ServerLogService } from '../log-service';
import { Utils } from '../utils';
import _ from 'lodash';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { API } from '../api';
import { iLedRgbCct } from '../../devices/baseDeviceInterfaces/iLedRgbCct';
import { BlockAutomaticHandler } from '../blockAutomaticHandler';
import { GoveeDeviceData } from './govee-device-data';
import { GooveeService } from './govee-service';

export class OwnGoveeDevice implements iLedRgbCct, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  public settings: LedSettings = new LedSettings();
  /** @inheritDoc */
  public readonly deviceType: DeviceType = DeviceType.GoveeLed;
  /**
   * The id of the device
   */
  public readonly deviceId: string;
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [
    DeviceCapability.ledLamp,
    DeviceCapability.lamp,
    DeviceCapability.dimmablelamp,
    DeviceCapability.blockAutomatic,
  ];
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  /** @inheritDoc */
  public brightness: number = -1;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  protected _info: DeviceInfo;
  private _actuatorOn: boolean = false;
  private _color: string = '#fcba32';
  private _colortemp: number = 500;
  private _room: RoomBase | undefined = undefined;

  public constructor(deviceId: string, ownDeviceName: string, roomName: string) {
    this.deviceId = deviceId;
    this._info = new DeviceInfo();
    this._info.fullName = `Govee ${roomName} ${ownDeviceName}`;
    this._info.customName = `Govee ${ownDeviceName}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `govee-${roomName}-${deviceId}`;
    Devices.alLDevices[`govee-${roomName}-${deviceId}`] = this;
    this.persistDeviceInfo();
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
    Utils.guardedTimeout(this.loadDeviceSettings, 300, this);
  }

  public get color(): string {
    return this._color;
  }

  public get colortemp(): number {
    return this._colortemp;
  }

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
    return this._actuatorOn;
  }

  public get info(): DeviceInfo {
    return this._info;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `govee-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, message, {
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

  /** @inheritDoc */
  public setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setLight(LedSetLightCommand.byTimeBased(this.settings, c));
  }

  /** @inheritDoc */
  public setLight(c: LedSetLightCommand): void {
    if (c.on && c.brightness === -1 && this.brightness < 10) {
      c.brightness = 10;
    }
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);

    if (c.on) {
      // Changing the color turns the device on as well --> Only change color on turn on actions
      const formattedColor: string | null = Utils.formatHex(c.color);
      if (formattedColor !== null) {
        this.setColor(c.color);
      }
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, c);

    if (LampUtils.checkBlockActive(this, c)) {
      return;
    }
    if (c.isAutomaticAction) {
      // Preserve the target state for the automatic handler, as
      this.targetAutomaticState = c.on;
    }

    if (LampUtils.canDimmerChangeBeSkipped(this, c)) {
      return;
    }
    if (c.brightness > -1 && c.on) {
      this.setBrightness(c.brightness, () => {
        this.turnOn();
      });
    } else if (c.on) {
      this.turnOn();
    } else {
      this.turnOff();
    }
    if (c.disableAutomaticCommand && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(c.disableAutomaticCommand);
    }
  }

  public setActuator(c: ActuatorSetStateCommand): void {
    this.setLight(new LedSetLightCommand(c, c.on, c.reason));
  }

  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.setActuator(new ActuatorSetStateCommand(c, this.targetAutomaticState));
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, c);
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    if (c.stateValue) {
      this.turnOn();
    } else {
      this.turnOff();
    }
  }

  public update(data: GoveeDeviceData): void {
    this.queuedValue = null;
    this._actuatorOn = data.actuatorOn;
    this.brightness = data.brightness;
    this._color = data.hexColor;
    this._colortemp = data.colortemp;
  }

  private setBrightness(brightness: number, cb: () => void): void {
    GooveeService.sendCommand(this, `brightness/${brightness}`).then((result) => {
      if (!result) {
        this.log(LogLevel.Error, 'Govee set brightness resulted in error');
      }
      cb();
    });
  }

  private setColor(color: string): void {
    GooveeService.sendCommand(this, `color/${color.replace('#', '')}`).then((result) => {
      if (!result) {
        this.log(LogLevel.Error, 'Govee set color resulted in error');
      } else {
        this.log(LogLevel.Debug, `Govee set color to ${color}`, LogDebugType.SetActuator);
      }
    });
  }

  private turnOn(): void {
    if (this._actuatorOn) {
      return;
    }
    this.queuedValue = true;
    GooveeService.sendCommand(this, `on/true`).then((result) => {
      if (!result) {
        this.log(LogLevel.Error, 'Govee turn on resulted in error');
      } else {
        this.log(LogLevel.Debug, `Govee turned on`, LogDebugType.SetActuator);
      }
    });
  }

  private turnOff(): void {
    if (!this._actuatorOn) {
      return;
    }
    this.queuedValue = false;
    GooveeService.sendCommand(this, `on/false`).then((result) => {
      if (!result) {
        this.log(LogLevel.Error, 'Govee turn off resulted in error');
      } else {
        this.log(LogLevel.Debug, `Govee turned off`, LogDebugType.SetActuator);
      }
    });
  }
}
