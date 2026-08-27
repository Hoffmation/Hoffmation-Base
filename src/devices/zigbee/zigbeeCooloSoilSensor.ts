import { iHumidityCollector, iHumiditySensor, iTemperatureCollector } from '../../interfaces';
import { HumiditySensorChangeAction, TemperatureSensorChangeAction } from '../../action';
import { ZigbeeSoilSensor } from './BaseDevices';
import { HumiditySensor, TemperatureSensor } from '../sharedFunctions';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType } from '../../enums';

/**
 * The COOLO CS-201Z soil sensor.
 *
 * Beyond the soil moisture and battery of {@link ZigbeeSoilSensor} it measures the air around it, so it adds
 * the ambient temperature and humidity axes. Those are three separate quantities: `soil_moisture` and
 * `humidity` are both percentages and can be told apart by nothing but which state they arrived on - the
 * device reported 15 % soil against 91 % air on the same message.
 *
 * The configuration states the device exposes (`soil_calibration`, `soil_warning`, `temperature_calibration`,
 * `temperature_sampling`, `soil_sampling`, `temperature_unit`) and the `dry` flag it derives from its own
 * threshold are deliberately not mapped. They stay reachable through `stateMap` and `send_payload`.
 */
export class ZigbeeCooloSoilSensor extends ZigbeeSoilSensor implements iTemperatureCollector, iHumidityCollector {
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);
  /** @inheritDoc */
  public humiditySensor: iHumiditySensor = new HumiditySensor(this);

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeCooloSoilSensor);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
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
    // The base class handles `soil_moisture` and `battery`; these two are the air around the pot.
    super.update(idSplit, state, initial);
    switch (idSplit[3]) {
      case 'humidity':
        this.humiditySensor.humidity = state.val as number;
        break;
      case 'temperature':
        this.temperatureSensor.temperature = state.val as number;
        break;
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    this.temperatureSensor.dispose();
    this.humiditySensor.dispose();
    super.dispose();
  }
}
