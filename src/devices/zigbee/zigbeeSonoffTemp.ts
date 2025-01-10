import { iBatteryDevice, iHumiditySensor, iTemperatureSensor } from '../../interfaces';
import { BatteryLevelChangeAction, HumiditySensorChangeAction, TemperatureSensorChangeAction } from '../../action';
import { ZigbeeDevice } from './BaseDevices';
import { Battery, HumiditySensor, TemperatureSensor } from '../sharedFunctions';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';

export class ZigbeeSonoffTemp extends ZigbeeDevice implements iTemperatureSensor, iHumiditySensor, iBatteryDevice {
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);
  /** @inheritDoc */
  public humiditySensor: HumiditySensor = new HumiditySensor(this);
  /** @inheritDoc */
  public battery: Battery = new Battery(this);

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffTemp);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
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
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this.battery.addBatteryLevelCallback(pCallback);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
      case 'humidity':
        this.humiditySensor.humidity = state.val as number;
        break;
      case 'temperature':
        this.temperatureSensor.temperature = state.val as number;
        break;
    }
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
  public dispose(): void {
    this.temperatureSensor.dispose();
    this.humiditySensor.dispose();
    super.dispose();
  }
}
