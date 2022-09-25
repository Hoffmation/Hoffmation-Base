import {
  DeviceInfo,
  Devices,
  DeviceType,
  iAcDevice,
  iExcessEnergyConsumer,
  iRoomDevice,
  UNDEFINED_TEMP_VALUE,
} from '../../devices';
import { ExcessEnergyConsumerSettings, LogLevel, RoomBase } from '../../../models';
import { Utils } from '../utils';
import { LogDebugType, ServerLogService } from '../log-service';
import { AcMode } from './ac-mode';
import { AcSettings } from '../../../models/deviceSettings/acSettings';
import { AcDeviceType } from './acDeviceType';
import _ from 'lodash';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { SettingsService } from '../settings-service';
import { HeatingMode } from '../../config';

export abstract class AcDevice implements iExcessEnergyConsumer, iRoomDevice, iAcDevice {
  public currentConsumption: number = -1;
  public energyConsumerSettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  public acSettings: AcSettings = new AcSettings();
  public room: RoomBase | undefined;
  public deviceCapabilities: DeviceCapability[] = [DeviceCapability.ac];

  protected _info: DeviceInfo;

  public get temperature(): number {
    return this._roomTemperature;
  }

  protected constructor(name: string, roomName: string, public ip: string, public acDeviceType: AcDeviceType) {
    this._info = new DeviceInfo();
    this._info.fullName = `AC ${name}`;
    this._info.customName = `${roomName} ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `ac-${roomName}-${name}`;
    Utils.guardedInterval(this.automaticCheck, 5 * 60 * 1000, this, true);
    Utils.guardedInterval(this.persist, 15 * 60 * 1000, this, true);
    this.persistDeviceInfo();
  }

  private _roomTemperature: number = 0;

  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  public get info(): DeviceInfo {
    return this._info;
  }

  protected set roomTemperatur(val: number) {
    this._roomTemperature = val;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  public abstract get deviceType(): DeviceType;

  public get name(): string {
    return this.info.customName;
  }

  protected _activatedByExcessEnergy: boolean = false;
  protected _blockAutomaticTurnOnMS: number = -1;

  public get id(): string {
    return this.info.allDevicesKey ?? `ac-${this.info.room}-${this.info.customName}`;
  }

  public abstract get on(): boolean;

  public isAvailableForExcessEnergy(): boolean {
    if (Utils.nowMS() < this._blockAutomaticTurnOnMS) {
      return false;
    }
    const minimumStart: Date = Utils.dateByTimeSpan(this.acSettings.minimumHours, this.acSettings.minimumMinutes);
    const maximumEnd: Date = Utils.dateByTimeSpan(this.acSettings.maximumHours, this.acSettings.maximumMinutes);
    const now: Date = new Date();
    if (now < minimumStart || now > maximumEnd) {
      return false;
    }
    return this.calculateDesiredMode() !== AcMode.Off;
  }

  public calculateDesiredMode(): AcMode {
    const temp: number | undefined = this.roomTemperature;
    if (temp === undefined || temp === UNDEFINED_TEMP_VALUE) {
      this.log(LogLevel.Warn, `Can't calculate AC Mode as we have no room temperature`);
      return AcMode.Off;
    }
    const acOn: boolean = this.on;

    let threshold: number = acOn ? 0 : 1;
    let desiredMode: AcMode = AcMode.Off;
    const excessEnergy: number = Devices.energymanager?.excessEnergy ?? -1;
    if ((acOn ? 200 : 1000) < excessEnergy) {
      // As there is plenty of energy to spare we plan to overshoot the target by 1 degree
      threshold = -1;
    }

    const coolUntil: number = this.acSettings.stopCoolingTemperatur + threshold;
    const heatUntil: number = this.acSettings.stopHeatingTemperatur - threshold;

    if (temp > coolUntil && SettingsService.heatMode === HeatingMode.Sommer) {
      desiredMode = AcMode.Cooling;
    } else if (temp < heatUntil && this.acSettings.heatingAllowed && SettingsService.heatMode === HeatingMode.Winter) {
      desiredMode = AcMode.Heating;
    }
    if (acOn ? desiredMode === AcMode.Off : desiredMode !== AcMode.Off) {
      this.log(
        LogLevel.Info,
        `Ac (currently on: ${acOn}) not in desired mode (${desiredMode}). Room Temp ${temp}, coolUntil ${coolUntil}, heatUntil ${heatUntil}, excessEnergy ${excessEnergy}.`,
      );
    }
    return desiredMode;
  }

  /**
   * Disable automatic Turn-On for given amount of ms and turn off immediately.
   * @param {number} timeout
   */
  public deactivateAutomaticChange(timeout: number = 60 * 60 * 1000): void {
    this._blockAutomaticTurnOnMS = Utils.nowMS() + timeout;
  }

  public abstract setDesiredMode(mode: AcMode, writeToDevice: boolean): void;

  public abstract turnOn(): void;

  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperatur = newTemperatur;
  }

  public persist(): void {
    if (!Utils.anyDboActive) {
      return;
    }
    Utils.dbo?.persistAC(this);
  }

  public turnOnForExcessEnergy(): void {
    if (this._blockAutomaticTurnOnMS > Utils.nowMS()) {
      return;
    }
    this._activatedByExcessEnergy = true;
    this.setDesiredMode(this.calculateDesiredMode(), false);
    this.turnOn();
  }

  public abstract turnOff(): void;

  public turnOffDueToMissingEnergy(): void {
    this.turnOff();
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public wasActivatedByExcessEnergy(): boolean {
    return this._activatedByExcessEnergy;
  }

  protected automaticCheck(): void {
    const desiredMode: AcMode = this.calculateDesiredMode();
    if (Utils.nowMS() < this._blockAutomaticTurnOnMS || this.on === (desiredMode !== AcMode.Off)) {
      // Device already in desired state --> do nothing
      return;
    }

    if (desiredMode === AcMode.Heating && SettingsService.settings.heaterSettings?.allowAcHeating) {
      this.setDesiredMode(AcMode.Heating, false);
      this.turnOn();
      return;
    }

    if (desiredMode == AcMode.Off && (this.energyConsumerSettings.priority === -1 || this._activatedByExcessEnergy)) {
      this.turnOff();
    }

    // Check Cooling Turn Off
    const maximumEnd: Date = Utils.dateByTimeSpan(this.acSettings.maximumHours, this.acSettings.maximumMinutes);
    const now: Date = new Date();
    if (now > maximumEnd) {
      this.turnOff();
      return;
    }
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

  public toJSON(): Partial<AcDevice> {
    // eslint-disable-next-line
    const result: any = _.omit(this, ['room']);
    result['on'] = this.on;
    return Utils.jsonFilter(result);
  }
}
