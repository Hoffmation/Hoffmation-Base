import { iHumiditySensor, iTemperatureSensor } from '../baseDeviceInterfaces';
import { SmartGardenDevice } from './smartGardenDevice';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { DeviceCapability } from '../DeviceCapability';
import { HumiditySensor, TemperatureSensor } from '../sharedFunctions';
import { HumiditySensorChangeAction, TemperatureSensorChangeAction } from '../../models/action';

export class SmartGardenSensor extends SmartGardenDevice implements iHumiditySensor, iTemperatureSensor {
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);
  /** @inheritDoc */
  public humiditySensor: HumiditySensor = new HumiditySensor(this);

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.SmartGardenSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this.temperatureSensor.roomTemperature;
  }

  /** @inheritDoc */
  public set roomTemperature(value: number) {
    this.temperatureSensor.roomTemperature = value;
  }

  /** @inheritDoc */
  public get humidity(): number {
    return this.humiditySensor.humidity;
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    return this.temperatureSensor.temperature;
  }

  /** @inheritDoc */
  public get sTemperature(): string {
    return `${this.temperatureSensor.temperature}°C`;
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this.humiditySensor.addHumidityCallback(pCallback);
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this.temperatureSensor.addTempChangeCallback(pCallback);
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
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
          this.humiditySensor.humidity = state.val as number;
          break;
        case 'soilTemperature_value':
          this.temperatureSensor.temperature = state.val as number;
          break;
      }
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    this.temperatureSensor.dispose();
    this.humiditySensor.dispose();
    super.dispose();
  }
}
