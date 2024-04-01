import {
  DeviceInfo,
  Devices,
  DeviceType,
  iAcDevice,
  iExcessEnergyConsumer,
  iRoomDevice,
  iTemporaryDisableAutomatic,
  UNDEFINED_TEMP_VALUE,
} from '../../devices';
import {
  AcSettings,
  BlockAutomaticCommand,
  CommandSource,
  ExcessEnergyConsumerSettings,
  LogLevel,
  PresenceGroupFirstEnterAction,
  PresenceGroupLastLeftAction,
  RoomBase,
} from '../../../models';
import { Utils } from '../utils';
import { LogDebugType, ServerLogService } from '../log-service';
import { AcMode } from './ac-mode';
import { AcDeviceType } from './acDeviceType';
import _ from 'lodash';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { SettingsService } from '../settings-service';
import { HeatingMode } from '../../config';
import { BlockAutomaticHandler } from '../blockAutomaticHandler';

export abstract class AcDevice implements iExcessEnergyConsumer, iRoomDevice, iAcDevice, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  public currentConsumption: number = -1;
  /** @inheritDoc */
  public settings: AcSettings = new AcSettings();
  /** @inheritDoc */
  public deviceCapabilities: DeviceCapability[] = [DeviceCapability.ac, DeviceCapability.blockAutomatic];
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  protected _activatedByExcessEnergy: boolean = false;
  protected _desiredTemperatur: number = UNDEFINED_TEMP_VALUE;

  protected _info: DeviceInfo;
  protected _room: RoomBase | undefined;
  protected _mode: AcMode = AcMode.Off;
  private _movementCallbackAdded: boolean = false;

  /**
   * Whether the AC is allowed to cool (depends on the season
   * @returns {boolean} True if the AC is allowed to cool
   */
  public get coolingAllowed(): boolean {
    if (SettingsService.heatMode !== HeatingMode.Summer) {
      return false;
    }
    if (this.settings.noCoolingOnMovement && this.room?.PraesenzGroup?.anyPresent()) {
      return false;
    }
    return true;
  }

  /**
   * Whether the AC is allowed to heat (depends on the season and the settings)
   * @returns {boolean} True if the AC is allowed to heat
   */
  public get heatingAllowed(): boolean {
    return SettingsService.heatMode !== HeatingMode.Summer && this.settings.heatingAllowed;
  }

  /** @inheritDoc */
  public get temperature(): number {
    return this._roomTemperature;
  }

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get room(): RoomBase | undefined {
    return this._room;
  }

  /** @inheritDoc */
  public set room(room: RoomBase | undefined) {
    this._room = room;
    if (room !== undefined && !this._movementCallbackAdded) {
      this._movementCallbackAdded = true;
      room?.PraesenzGroup?.addFirstEnterCallback(this.onRoomFirstEnter.bind(this));
      room?.PraesenzGroup?.addLastLeftCallback(this.onRoomLastLeave.bind(this));
    }
  }

  /** @inheritDoc */
  public get mode(): AcMode {
    return this._mode;
  }

  protected constructor(
    name: string,
    roomName: string,
    public ip: string,
    public acDeviceType: AcDeviceType,
  ) {
    this._info = new DeviceInfo();
    this._info.fullName = `AC ${name}`;
    this._info.customName = `${roomName} ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `ac-${roomName}-${name}`;
    Utils.guardedInterval(this.automaticCheck, 5 * 60 * 1000, this, false);
    Utils.guardedInterval(this.persist, 15 * 60 * 1000, this, true);
    this.persistDeviceInfo();
    this.loadDeviceSettings();
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  /** @inheritDoc */
  public get energySettings(): ExcessEnergyConsumerSettings {
    return this.settings.energySettings;
  }

  private _roomTemperature: number = 0;

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  /** @inheritDoc */
  public get info(): DeviceInfo {
    return this._info;
  }

  protected set roomTemperatur(val: number) {
    this._roomTemperature = val;
  }

  public abstract get deviceType(): DeviceType;

  /**
   * The name of this device
   * @returns The human readable name of this device
   */
  public get name(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `ac-${this.info.room}-${this.info.customName}`;
  }

  public abstract get on(): boolean;

  /** @inheritDoc */
  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, 'Restore Target Automatic value');
    this.automaticCheck();
  }

  /** @inheritDoc */
  public isAvailableForExcessEnergy(): boolean {
    if (this.settings.useAutomatic || (this.room?.HeatGroup?.settings.automaticMode && this.settings.heatingAllowed)) {
      return false;
    }
    if (this.blockAutomationHandler.automaticBlockActive) {
      return false;
    }
    if (
      !Utils.timeWithinBorders(
        this.settings.minimumHours,
        this.settings.minimumMinutes,
        this.settings.maximumHours,
        this.settings.maximumMinutes,
      )
    ) {
      return false;
    }
    return this.calculateDesiredMode() !== AcMode.Off;
  }

  /** @inheritDoc */
  public calculateDesiredMode(): AcMode {
    const acOn: boolean = this.on;
    const heatGroup = this.room?.HeatGroup;
    if (!heatGroup) {
      this.log(LogLevel.Warn, "Can't calculate AC Mode as we have no heat group");
      return AcMode.Off;
    }
    this._desiredTemperatur = heatGroup.desiredTemp;

    if (this.settings.manualDisabled) {
      acOn && this.log(LogLevel.Info, 'We should turn off now, as manual disable force is set.');
      return AcMode.Off;
    }

    // Check Turn Off Time
    if (
      !Utils.timeWithinBorders(
        this.settings.minimumHours,
        this.settings.minimumMinutes,
        this.settings.maximumHours,
        this.settings.maximumMinutes,
      )
    ) {
      acOn && this.log(LogLevel.Info, 'We should turn off now, to respect night settings.');
      return AcMode.Off;
    }

    if (this.settings.useOwnTemperature) {
      // Device is in automatic mode so ignore energy and room temperature
      if (this.settings.useAutomatic) {
        return AcMode.Auto;
      }

      if (this.heatingAllowed) {
        return AcMode.Heating;
      } else if (this.coolingAllowed) {
        return AcMode.Cooling;
      }
      return AcMode.Off;
    }

    const temp: number | undefined = this.roomTemperature;
    if (temp === undefined || temp === UNDEFINED_TEMP_VALUE) {
      this.log(LogLevel.Warn, "Can't calculate AC Mode as we have no room temperature");
      return AcMode.Off;
    }

    if (!heatGroup) {
      this.log(LogLevel.Warn, "Can't calculate AC Mode as we have no heat group");
      return AcMode.Off;
    }

    let threshold: number = acOn ? 0.5 : 1.5;
    let thresholdHeating: number = acOn ? 0.5 : 1.5;
    let desiredMode: AcMode = AcMode.Off;
    const excessEnergy: number = Devices.energymanager?.excessEnergy ?? -1;

    if ((acOn ? 200 : 1000) < excessEnergy) {
      // As there is plenty of energy to spare we plan to overshoot the target by 1 degree
      threshold = -0.5;
      thresholdHeating = -0.5;
    }

    const targetTemp: number = heatGroup.desiredTemp;

    const coolUntil: number = targetTemp + threshold;
    const heatUntil: number = targetTemp - thresholdHeating;

    if (temp > coolUntil && this.coolingAllowed) {
      desiredMode = AcMode.Cooling;
    } else if (temp < heatUntil && this.heatingAllowed) {
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

  public abstract setDesiredMode(mode: AcMode, writeToDevice: boolean, temp?: number): void;

  public abstract turnOn(): void;

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperatur = newTemperatur;
  }

  /**
   * Persists the current AC-Information to the database
   */
  public persist(): void {
    if (!Utils.anyDboActive || this.on === undefined) {
      return;
    }
    Utils.dbo?.persistAC(this);
  }

  /** @inheritDoc */
  public turnOnForExcessEnergy(): void {
    if (this.blockAutomationHandler.automaticBlockActive) {
      return;
    }
    this._activatedByExcessEnergy = true;
    this.setDesiredMode(this.calculateDesiredMode(), false);
    this.turnOn();
  }

  public abstract turnOff(): void;

  /** @inheritDoc */
  public turnOffDueToMissingEnergy(): void {
    this.turnOff();
  }

  /**
   * Sets the state of the AC
   * TODO: Migrate to new command system
   * @param mode - The desired mode
   * @param desiredTemp - The desired temperature (if unset it will be calculated)
   * @param forceTime - The time in ms to force the AC to stay in this state (default 1h)
   */
  public setState(mode: AcMode, desiredTemp?: number, forceTime: number = 60 * 60 * 1000): void {
    this.blockAutomationHandler.disableAutomatic(new BlockAutomaticCommand(CommandSource.Unknown, forceTime));
    this._mode = mode;
    if (mode == AcMode.Off) {
      this.turnOff();
      return;
    }
    this.setDesiredMode(mode, false, desiredTemp);
    this.turnOn();
  }

  /** @inheritDoc */
  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  /** @inheritDoc */
  public wasActivatedByExcessEnergy(): boolean {
    return this._activatedByExcessEnergy;
  }

  /** @inheritDoc */
  public loadDeviceSettings(): void {
    this.settings.initializeFromDb(this);
  }

  /** @inheritDoc */
  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  protected automaticCheck(): void {
    if (this.blockAutomationHandler.automaticBlockActive) {
      // We aren't allowed to turn on or off anyway --> exit
      return;
    }

    const desiredMode: AcMode = this.calculateDesiredMode();
    if (this.on === (desiredMode !== AcMode.Off)) {
      // Device already in desired state --> do nothing
      return;
    }

    this.setDesiredMode(desiredMode, false);

    if (desiredMode == AcMode.Off) {
      this.turnOff();
      return;
    }
    this.turnOn();
  }

  private onRoomFirstEnter(_action: PresenceGroupFirstEnterAction): void {
    if (!this.settings.noCoolingOnMovement || !this.on || this.mode === AcMode.Heating) {
      return;
    }

    this.log(LogLevel.Info, 'Someone entered the room. Turning off AC');
    this.turnOff();
  }

  private onRoomLastLeave(action: PresenceGroupLastLeftAction): void {
    if (!this.settings.noCoolingOnMovement) {
      return;
    }

    this.log(LogLevel.Info, `Last person left the room (${action.reasonTrace}). Checking if we should turn on AC`);
    this.restoreTargetAutomaticValue();
  }

  /** @inheritDoc */
  public toJSON(): Partial<AcDevice> {
    // eslint-disable-next-line
    const result: any = _.omit(this, ['room', '_room']);
    result['on'] = this.on;
    return Utils.jsonFilter(result);
  }
}
