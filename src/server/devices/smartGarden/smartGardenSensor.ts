import { iHumiditySensor, iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { SmartGardenDevice } from './smartGardenDevice';
import { HumiditySensorChangeAction, TemperatureSensorChangeAction } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { DeviceCapability } from '../DeviceCapability';
import { Utils } from '../../services';

export class SmartGardenSensor extends SmartGardenDevice implements iHumiditySensor, iTemperatureSensor {
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
  public readonly persistTemperatureSensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistTemperaturSensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  private _humidityCallbacks: ((action: HumiditySensorChangeAction) => void)[] = [];
  private _humidity: number = UNDEFINED_TEMP_VALUE;
  private _roomTemperature: number = UNDEFINED_TEMP_VALUE;
  private _temperature: number = UNDEFINED_TEMP_VALUE;
  private _temperaturCallbacks: ((action: TemperatureSensorChangeAction) => void)[] = [];

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.SmartGardenSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  /** @inheritDoc */
  public set roomTemperature(value: number) {
    this._roomTemperature = value;
  }

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

  /** @inheritDoc */
  public get iTemperature(): number {
    return this._temperature;
  }

  /** @inheritDoc */
  public get sTemperature(): string {
    return `${this._temperature}°C`;
  }

  private set temperature(val: number) {
    this._temperature = val;
    for (const cb of this._temperaturCallbacks) {
      cb(new TemperatureSensorChangeAction(this, val));
    }
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(new HumiditySensorChangeAction(this, this._humidity));
    }
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this._temperaturCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(new TemperatureSensorChangeAction(this, this._temperature));
    }
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public persistHumiditySensor(): void {
    Utils.dbo?.persistHumiditySensor(this);
  }

  /** @inheritDoc */
  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    if (idSplit.length < 6) {
      return;
    }
    const folder: string = idSplit[4];
    const stateName: string = idSplit[5];
    if (folder.indexOf('SERVICE_SENSOR') === 0) {
      switch (stateName) {
        case 'soilHumidity_value':
          this.humidity = state.val as number;
          break;
        case 'soilTemperature_value':
          this.temperature = state.val as number;
          break;
      }
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this.persistTemperatureSensorInterval) {
      clearInterval(this.persistTemperatureSensorInterval);
    }
    if (this.persistHumiditySensorInterval) {
      clearInterval(this.persistHumiditySensorInterval);
    }
    super.dispose();
  }
}
