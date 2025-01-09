import { ZigbeeDevice } from './zigbeeDevice.js';
import { iBatteryDevice, iHeater, UNDEFINED_TEMP_VALUE } from '../../baseDeviceInterfaces/index.js';
import {
  HandleChangeAction,
  HeaterSettings,
  LogLevel,
  TemperatureSensorChangeAction,
  TimeCallback,
  TimeCallbackType,
} from '../../../../models/index.js';
import { DeviceType } from '../../deviceType.js';
import { TimeCallbackService, Utils } from '../../../services/index.js';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo.js';
import { DeviceCapability } from '../../DeviceCapability.js';
import { PIDController } from '../../../../liquid-pid.js';
import { HeatGroup } from '../../groups/index.js';
import { Battery, TemperatureSensor } from '../../sharedFunctions/index.js';

export class ZigbeeHeater extends ZigbeeDevice implements iHeater, iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  /** @inheritDoc */
  public readonly persistHeaterInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistHeater();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);
  /** @inheritDoc */
  public settings: HeaterSettings = new HeaterSettings();
  protected _battery: number = -99;
  protected _iAutomaticInterval: NodeJS.Timeout | undefined;
  protected _initialSeasonCheckDone: boolean = false;
  protected _level: number = 0;
  protected _setPointTemperaturID: string = '';
  protected _setWindowOpenID: string = '';
  protected _temperatur: number = UNDEFINED_TEMP_VALUE;
  protected _desiredTemperatur: number = UNDEFINED_TEMP_VALUE;
  protected _pidController: PIDController = new PIDController({
    temp: {
      ref: 20, // Point temperature
    },
    Pmax: 100, // Max power (output),

    // Tune the PID Controller
    Kp: 25, // PID: Kp in 1/1000
    Ki: 1000, // PID: Ki in 1/1000
    Kd: 9, // PID: Kd in 1/1000
  });
  protected _seasonTurnOff: boolean = false;
  protected _windowOpen: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this.deviceCapabilities.push(DeviceCapability.heater);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this._iAutomaticInterval = Utils.guardedInterval(this.checkAutomaticChange, 300000, this); // Alle 5 Minuten prüfen
    TimeCallbackService.addCallback(
      new TimeCallback(
        `${this.info.fullID} Season Check`,
        TimeCallbackType.TimeOfDay,
        () => {
          this.checkSeasonTurnOff();
        },
        0,
        2,
        0,
      ),
    );
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public get windowOpen(): boolean {
    return this._windowOpen;
  }

  /** @inheritDoc */
  public get seasonTurnOff(): boolean {
    return this._seasonTurnOff;
  }

  /** @inheritDoc */
  public set seasonTurnOff(value: boolean) {
    this._seasonTurnOff = value;
  }

  /** @inheritDoc */
  public get desiredTemperature(): number {
    return this._desiredTemperatur;
  }

  /** @inheritDoc */
  public set desiredTemperature(val: number) {
    this._desiredTemperatur = val;
    this.setState(
      this._setPointTemperaturID,
      val,
      () => {
        this.log(LogLevel.Info, `Changed temperature of to "${val}.`);
      },
      (err: Error) => {
        this.log(LogLevel.Error, `Temperaturänderung ergab Fehler ${err}.`);
      },
    );
  }

  public get sLevel(): string {
    return `${this._level * 100}%`;
  }

  /** @inheritDoc */
  public get iLevel(): number {
    return this._level;
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    if (this.settings.useOwnTemperatureForRoomTemperature) {
      return this.temperatureSensor.temperature;
    } else {
      return this.roomTemperature;
    }
  }

  /** @inheritDoc */
  public get sTemperature(): string {
    return `${this.iTemperature}°C`;
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this.temperatureSensor.roomTemperature;
  }

  protected set roomTemperature(val: number) {
    this.temperatureSensor.roomTemperature = val;
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this.temperatureSensor.addTempChangeCallback(pCallback);
  }

  /** @inheritDoc */
  public checkAutomaticChange(): void {
    if (!this._initialSeasonCheckDone) {
      this.checkSeasonTurnOff();
    }
    const heatGroup: HeatGroup | undefined = this.room.HeatGroup;
    if (this.seasonTurnOff || this.settings.manualDisabled) {
      this.desiredTemperature = 0;
      return;
    }
    if (!this.settings.automaticMode || this.seasonTurnOff || heatGroup?.settings?.automaticMode === false) {
      return;
    }
    if (heatGroup === undefined) {
      this.log(LogLevel.Warn, `Heat-Group is undefined for ${this.info.customName}.`);
      return;
    }

    const targetTemperature: number = heatGroup.desiredTemp;
    if (this._desiredTemperatur !== targetTemperature) {
      this.log(
        LogLevel.Debug,
        `Automatische Temperaturanpassung für ${this.info.customName} auf ${targetTemperature}°C`,
      );
      this.desiredTemperature = targetTemperature;
    }
  }

  public onHandleChange(_action: HandleChangeAction): void {
    if (this.room.WindowGroup === undefined) {
      return;
    }
    const newState: boolean = this.room.WindowGroup?.anyWindowOpen;
    if (newState === this._windowOpen) {
      return;
    }
    this._windowOpen = newState;
    this.onWindowOpenChange(this._windowOpen);
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  public persistHeater(): void {
    Utils.dbo?.persistHeater(this);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
    }
    super.update(idSplit, state, initial, pOverride);
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this.persistHeaterInterval) {
      clearInterval(this.persistHeaterInterval);
    }
    if (this._iAutomaticInterval) {
      clearInterval(this._iAutomaticInterval);
      this._iAutomaticInterval = undefined;
    }
    super.dispose();
  }

  protected getNextPidLevel(): number {
    if (this.seasonTurnOff || this.roomTemperature < 0) {
      return 0;
    }
    this._pidController.setPoint(this.desiredTemperature);
    const newValue: number = this._pidController.calculate(this.roomTemperature);
    this.log(
      LogLevel.Debug,
      `New PID Value ${newValue}% (cTemp: ${this.roomTemperature}, dTemp: ${this.desiredTemperature})`,
    );
    return newValue;
  }

  private checkSeasonTurnOff(): void {
    const desiredState: boolean = Utils.beetweenDays(
      new Date(),
      this.settings.seasonTurnOffDay,
      this.settings.seasonTurnOnDay,
    );
    if (desiredState !== this.seasonTurnOff || !this._initialSeasonCheckDone) {
      this.log(LogLevel.Info, `Switching Seasonal Heating --> New seasonTurnOff: ${desiredState}`);
      this.seasonTurnOff = desiredState;
    }
    this._initialSeasonCheckDone = true;
  }

  private onWindowOpenChange(pValue: boolean): void {
    if (!this._setWindowOpenID) {
      return;
    }
    this.setState(this._setWindowOpenID, pValue);
  }
}
