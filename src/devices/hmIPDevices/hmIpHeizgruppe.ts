import { HmIPDevice } from './hmIpDevice';
import { iDisposable, iHeater, iHumiditySensor, iTemperatureSensor } from '../../interfaces';
import { Utils } from '../../utils';
import { HumiditySensor, TemperatureSensor } from '../sharedFunctions';
import { HeaterSettings } from '../deviceSettings';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceClusterType, DeviceType, LogLevel, TimeCallbackType } from '../../enums';
import { TimeCallbackService } from '../../services';
import {
  HandleChangeAction,
  HeatGroupSettings,
  HumiditySensorChangeAction,
  TemperatureSensorChangeAction,
  TimeCallback,
} from '../../models';

export class HmIpHeizgruppe extends HmIPDevice implements iTemperatureSensor, iHumiditySensor, iHeater, iDisposable {
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
  public humiditySensor: HumiditySensor = new HumiditySensor(this);
  /** @inheritDoc */
  public settings: HeaterSettings = new HeaterSettings();
  private readonly _setWindowOpenID: string = '';
  private _iAutomaticInterval: NodeJS.Timeout | undefined;
  private _initialSeasonCheckDone: boolean = false;
  private _level: number = 0;
  private _setPointTemperatureID: string = '';
  private _windowOpen: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizgruppe);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.heater);
    this._setPointTemperatureID = `${this.info.fullID}.1.SET_POINT_TEMPERATURE`;
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

  protected _seasonTurnOff: boolean = false;

  /** @inheritDoc */
  public get seasonTurnOff(): boolean {
    return this._seasonTurnOff;
  }

  /** @inheritDoc */
  public set seasonTurnOff(value: boolean) {
    this._seasonTurnOff = value;
    if (value) {
      this.setState(this._setPointTemperatureID, 5);
    } else {
      this.setState(this._setPointTemperatureID, this.desiredTemperature);
    }
  }

  public get temperature(): number {
    if (this.settings.useOwnTemperatur) {
      return this.temperatureSensor.temperature;
    }
    return this.roomTemperature;
  }

  /** @inheritDoc */
  public get humidity(): number {
    return this.humiditySensor.humidity;
  }

  private _desiredTemperature: number = 0;

  /** @inheritDoc */
  public get desiredTemperature(): number {
    return this._desiredTemperature;
  }

  /** @inheritDoc */
  public set desiredTemperature(val: number) {
    this.setState(
      this._setPointTemperatureID,
      this.seasonTurnOff ? 5 : val,
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
  public get sTemperature(): string {
    return `${this.temperature}°C`;
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    return this.temperature;
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this.temperatureSensor.roomTemperature;
  }

  /** @inheritDoc */
  public get windowOpen(): boolean {
    return this._windowOpen;
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this.humiditySensor.addHumidityCallback(pCallback);
  }

  public getBelongingHeizungen(): iHeater[] {
    return this.room.deviceCluster.getDevicesByType(DeviceClusterType.Heater) as iHeater[];
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Heizgruppe Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
      case '1':
        this.updateBaseInformation(idSplit[4], state);
        break;
    }
  }

  /** @inheritDoc */
  public checkAutomaticChange(): void {
    if (!this._initialSeasonCheckDone) {
      this.checkSeasonTurnOff();
    }

    if (this.seasonTurnOff || this.settings.manualDisabled) {
      this.seasonTurnOff = true;
      return;
    }
    const heatGroupSettings: HeatGroupSettings | undefined = this.room?.HeatGroup?.settings;
    if (!this.settings.automaticMode || this.seasonTurnOff || heatGroupSettings?.automaticMode === false) {
      return;
    }

    const targetTemp = this.room.HeatGroup?.desiredTemp ?? 20;
    if (this._desiredTemperature !== targetTemp) {
      this.log(LogLevel.Debug, `Automatische Temperaturanpassung für ${this.info.customName} auf ${targetTemp}°C`);
      this.desiredTemperature = targetTemp;
    }
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this.temperatureSensor.addTempChangeCallback(pCallback);
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.temperatureSensor.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public persistTemperaturSensor(): void {
    this.dbo?.persistTemperatureSensor(this);
  }

  /** @inheritDoc */
  public persistHeater(): void {
    this.dbo?.persistHeater(this);
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
  public dispose(): void {
    this.temperatureSensor.dispose();
    this.humiditySensor.dispose();
    if (this.persistHeaterInterval) {
      clearInterval(this.persistHeaterInterval);
    }
    if (this._iAutomaticInterval) {
      clearInterval(this._iAutomaticInterval);
      this._iAutomaticInterval = undefined;
    }
  }

  private checkSeasonTurnOff(): void {
    const isSummer: boolean = Utils.beetweenDays(
      new Date(),
      this.settings.seasonTurnOffDay,
      this.settings.seasonTurnOnDay,
    );
    if (isSummer !== this.seasonTurnOff || !this._initialSeasonCheckDone) {
      this.log(LogLevel.Info, `Switching Seasonal Heating --> New seasonTurnOff: ${isSummer}`);
      this.seasonTurnOff = isSummer;
    }
    this._initialSeasonCheckDone = true;
  }

  private onWindowOpenChange(pValue: boolean): void {
    if (!this._setWindowOpenID) {
      return;
    }
    this.setState(this._setWindowOpenID, pValue);
  }

  private updateBaseInformation(name: string, state: ioBroker.State) {
    switch (name) {
      case 'ACTUAL_TEMPERATURE':
        this.temperatureSensor.temperature = state.val as number;
        break;
      case 'LEVEL':
        this._level = state.val as number;
        break;
      case 'HUMIDITY':
        this.humiditySensor.humidity = state.val as number;
        break;
      case 'SET_POINT_TEMPERATURE':
        this.log(LogLevel.DeepTrace, `Heizgruppe Update Soll-Temperatur JSON: ${JSON.stringify(state)}`);
        this._desiredTemperature = state.val as number;
        break;
    }
  }
}
