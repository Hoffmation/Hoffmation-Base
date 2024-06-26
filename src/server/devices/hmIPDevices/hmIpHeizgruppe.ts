import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { iDisposable, TimeCallbackService, Utils } from '../../services';
import {
  HeaterSettings,
  HumiditySensorChangeAction,
  LogLevel,
  TemperatureSensorChangeAction,
  TimeCallback,
  TimeCallbackType,
} from '../../../models';
import {
  iHeater,
  iHumiditySensor,
  iTemperatureSensor,
  UNDEFINED_HUMIDITY_VALUE,
  UNDEFINED_TEMP_VALUE,
} from '../baseDeviceInterfaces';
import { DeviceClusterType } from '../device-cluster-type';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { HeatGroupSettings } from '../../../models/groupSettings/heatGroupSettings';

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
  public readonly persistTemperatureSensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistTemperaturSensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  /** @inheritDoc */
  public readonly persistHumiditySensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistHumiditySensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  /** @inheritDoc */
  public settings: HeaterSettings = new HeaterSettings();
  private _iAutomaticInterval: NodeJS.Timeout | undefined;
  private _initialSeasonCheckDone: boolean = false;
  private _level: number = 0;
  private _setPointTemperatureID: string = '';
  private _humidityCallbacks: Array<(action: HumiditySensorChangeAction) => void> = [];
  private _temperatureCallbacks: ((action: TemperatureSensorChangeAction) => void)[] = [];

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

  private _temperature: number = UNDEFINED_TEMP_VALUE;

  public get temperature(): number {
    if (this.settings.useOwnTemperatur) {
      return this._temperature;
    }
    return this._roomTemperature;
  }

  private set temperature(val: number) {
    this._temperature = val;
    for (const cb of this._temperatureCallbacks) {
      cb(new TemperatureSensorChangeAction(this, val));
    }
  }

  private _humidity: number = UNDEFINED_HUMIDITY_VALUE;

  /** @inheritDoc */
  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(new HumiditySensorChangeAction(this, val));
    }
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

  private _roomTemperature: number = UNDEFINED_TEMP_VALUE;

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(new HumiditySensorChangeAction(this, this._humidity));
    }
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
    this._temperatureCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(new TemperatureSensorChangeAction(this, this._temperature));
    }
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this._roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  /** @inheritDoc */
  public persistHeater(): void {
    Utils.dbo?.persistHeater(this);
  }

  /** @inheritDoc */
  public persistHumiditySensor(): void {
    Utils.dbo?.persistHumiditySensor(this);
  }

  private updateBaseInformation(name: string, state: ioBroker.State) {
    switch (name) {
      case 'ACTUAL_TEMPERATURE':
        this.temperature = state.val as number;
        break;
      case 'LEVEL':
        this._level = state.val as number;
        break;
      case 'HUMIDITY':
        this.humidity = state.val as number;
        break;
      case 'SET_POINT_TEMPERATURE':
        this.log(LogLevel.DeepTrace, `Heizgruppe Update Soll-Temperatur JSON: ${JSON.stringify(state)}`);
        this._desiredTemperature = state.val as number;
        break;
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

  /** @inheritDoc */
  public dispose(): void {
    if (this.persistTemperatureSensorInterval) {
      clearInterval(this.persistTemperatureSensorInterval);
    }
    if (this.persistHumiditySensorInterval) {
      clearInterval(this.persistHumiditySensorInterval);
    }
    if (this.persistHeaterInterval) {
      clearInterval(this.persistHeaterInterval);
    }
    if (this._iAutomaticInterval) {
      clearInterval(this._iAutomaticInterval);
      this._iAutomaticInterval = undefined;
    }
  }
}
