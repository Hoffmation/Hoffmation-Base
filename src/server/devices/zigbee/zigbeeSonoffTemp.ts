import { ZigbeeDevice } from './BaseDevices';
import { iBatteryDevice, iHumiditySensor, iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { LogLevel } from '../../../models';
import { Utils } from '../../services';

export class ZigbeeSonoffTemp extends ZigbeeDevice implements iTemperatureSensor, iHumiditySensor, iBatteryDevice {
  public readonly persistTemperatureSensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistTemperaturSensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  public readonly persistHumiditySensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistHumiditySensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  public battery: number = -99;
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

  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  public set roomTemperature(value: number) {
    this._roomTemperature = value;
  }

  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(val);
    }
  }

  public get iTemperature(): number {
    return this._temperature;
  }

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

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          this.log(LogLevel.Warn, `Das Zigbee Gerät hat unter 20% Batterie.`);
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

  public addHumidityCallback(pCallback: (pValue: number) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(this._humidity);
    }
  }

  public addTempChangeCallback(pCallback: (pValue: number) => void): void {
    this._temperaturCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(this._temperature);
    }
  }

  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  public persistHumiditySensor(): void {
    Utils.dbo?.persistHumiditySensor(this);
  }
}
