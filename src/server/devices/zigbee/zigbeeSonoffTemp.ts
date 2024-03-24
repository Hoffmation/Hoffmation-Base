import { ZigbeeDevice } from './BaseDevices';
import { iBatteryDevice, iHumiditySensor, iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { LogLevel } from '../../../models';
import { Utils } from '../../services';

export class ZigbeeSonoffTemp extends ZigbeeDevice implements iTemperatureSensor, iHumiditySensor, iBatteryDevice {
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

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
  public get battery(): number {
    return this._battery;
  }

  private _humidityCallbacks: ((pValue: number) => void)[] = [];
  private _temperaturCallbacks: ((pValue: number) => void)[] = [];

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffTemp);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  private _humidity: number = UNDEFINED_TEMP_VALUE;
  private _roomTemperature: number = UNDEFINED_TEMP_VALUE;

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
      cb(val);
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

  private _temperature: number = UNDEFINED_TEMP_VALUE;

  private set temperature(val: number) {
    this._temperature = val;
    for (const cb of this._temperaturCallbacks) {
      cb(val);
    }
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this._battery = state.val as number;
        this.persistBatteryDevice();
        if (this._battery < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
      case 'humidity':
        this.humidity = state.val as number;
        break;
      case 'temperature':
        this.temperature = state.val as number;
        break;
    }
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (pValue: number) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(this._humidity);
    }
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (pValue: number) => void): void {
    this._temperaturCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(this._temperature);
    }
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  /** @inheritDoc */
  public persistHumiditySensor(): void {
    Utils.dbo?.persistHumiditySensor(this);
  }

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
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
