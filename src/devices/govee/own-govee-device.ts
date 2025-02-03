import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LedSetLightCommand,
  RestoreTargetAutomaticValueCommand,
} from '../../command';
import { DeviceCapability, DeviceType, LogDebugType, LogLevel } from '../../enums';
import { iLedRgbCct } from '../../interfaces/baseDevices/iLedRgbCct';
import { GoveeDeviceData, iTemporaryDisableAutomatic } from '../../interfaces';
import { BlockAutomaticHandler, Persistence } from '../../services';
import { Utils } from '../../utils';
import { GooveeService } from './govee-service';
import { RoomBaseDevice } from '../RoomBaseDevice';
import { LedSettings } from '../../settingsObjects';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { LampUtils } from '../sharedFunctions';

export class OwnGoveeDevice extends RoomBaseDevice implements iLedRgbCct, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  public override settings: LedSettings = new LedSettings();
  /**
   * The id of the device
   */
  public readonly deviceId: string;
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  /** @inheritDoc */
  public brightness: number = -1;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  private _actuatorOn: boolean = false;
  private _color: string = '#fcba32';
  private _colortemp: number = 500;
  protected _lastPersist: number = 0;

  public constructor(deviceId: string, ownDeviceName: string, roomName: string) {
    const info = new DeviceInfo();
    info.fullName = `Govee ${roomName} ${ownDeviceName}`;
    info.customName = `Govee ${ownDeviceName}`;
    info.room = roomName;
    const allDevicesKey = `govee-${roomName}-${deviceId}`;
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.GoveeLed);
    this.deviceId = deviceId;
    this.deviceCapabilities.push(
      ...[
        DeviceCapability.ledLamp,
        DeviceCapability.lamp,
        DeviceCapability.dimmablelamp,
        DeviceCapability.blockAutomatic,
      ],
    );
    Devices.alLDevices[allDevicesKey] = this;
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
  }

  public get color(): string {
    return this._color;
  }

  public get colortemp(): number {
    return this._colortemp;
  }

  public get actuatorOn(): boolean {
    return this._actuatorOn;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `govee-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setLight(this.settings.buildLedSetLightCommand(c));
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
    const now: number = Utils.nowMS();
    if (this._lastPersist + 1000 > now) {
      return;
    }
    Persistence.dbo?.persistActuator(this);
    this._lastPersist = now;
  }

  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = new ActuatorSetStateCommand(
      c,
      this.queuedValue !== null ? !this.queuedValue : !this.actuatorOn,
      'Due to ActuatorToggle',
      c.isForceAction ? undefined : null,
    );
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.logCommand(c, undefined, LogDebugType.SetActuator);
    if (c.stateValue) {
      this.turnOn();
    } else {
      this.turnOff();
    }
  }

  public update(data: GoveeDeviceData): void {
    this.queuedValue = null;
    const anyChanged: boolean =
      this._actuatorOn !== data.actuatorOn ||
      this.brightness !== data.brightness ||
      this._color !== data.hexColor ||
      this._colortemp !== data.colortemp;

    if (!anyChanged) {
      return;
    }

    this._actuatorOn = data.actuatorOn;
    this.brightness = data.brightness;
    this._color = data.hexColor;
    this._colortemp = data.colortemp;
    this.persist();
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
