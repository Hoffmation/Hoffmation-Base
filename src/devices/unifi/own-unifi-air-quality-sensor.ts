import type { ProtectSensorConfig, Sensor } from 'unifi-protect';
import {
  iAirQualityCollector,
  iAirQualityReadings,
  iAirQualitySensor,
  iHumidityCollector,
  iHumiditySensor,
  iTemperatureCollector,
} from '../../interfaces';
import { AirQualitySensorChangeAction, HumiditySensorChangeAction, TemperatureSensorChangeAction } from '../../action';
import { AirQualitySensor, HumiditySensor, TemperatureSensor } from '../sharedFunctions';
import { DeviceCapability, DeviceType } from '../../enums';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { RoomBaseDevice } from '../RoomBaseDevice';
import { Utils } from '../../utils';

/**
 * A UniFi Protect "UP Air Quality" sensor.
 *
 * The device reports temperature and humidity alongside its air quality metrics, so it acts as all three
 * collectors at once and its temperature/humidity history lands in the database like any other sensor.
 */
export class OwnUnifiAirQualitySensor
  extends RoomBaseDevice
  implements iTemperatureCollector, iHumidityCollector, iAirQualityCollector
{
  /**
   * The name of the sensor as written in Unifi-Protect
   */
  public readonly unifiSensorName: string;
  /**
   * The human readable name of this device
   */
  public readonly name: string;
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);
  /** @inheritDoc */
  public humiditySensor: iHumiditySensor = new HumiditySensor(this);
  /** @inheritDoc */
  public airQualitySensor: iAirQualitySensor = new AirQualitySensor(this);
  protected _lastUpdate: Date = new Date(0);
  // @ts-expect-error Sensor-Projektion wird später verwendet
  private _sensor: Sensor | null = null;
  private _lastReportedTemperature: number | undefined = undefined;
  private _lastReportedHumidity: number | undefined = undefined;

  public constructor(name: string, roomName: string, unifiSensorName: string) {
    const info = new DeviceInfo();
    info.fullName = `Air Quality ${roomName} ${name}`;
    info.customName = `Air Quality ${name}`;
    info.room = roomName;
    const allDevicesKey = `unifi-air-quality-${roomName}-${name}`;
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.UnifiAirQualitySensor);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.airQualitySensor);
    this.name = name;
    this.unifiSensorName = unifiSensorName;
    Devices.alLDevices[allDevicesKey] = this;
  }

  /**
   * The point in time this device last reported a reading.
   * @returns The timestamp of the last reading
   */
  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  /** @inheritDoc */
  public get airQuality(): iAirQualityReadings {
    return this.airQualitySensor.readings;
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

  /**
   * Binds this device to its live Unifi-Protect projection and applies the current readings.
   * @param sensor - The projection of the matching Unifi sensor
   */
  public initialize(sensor: Sensor): void {
    this._sensor = sensor;
    this.update(sensor.config);
  }

  /**
   * Applies the readings of the given sensor configuration.
   * @param config - The current configuration of the Unifi sensor
   */
  public update(config: ProtectSensorConfig): void {
    const airQuality: unknown = config.airQuality;
    this._lastUpdate = new Date();
    // The controller repeats unchanged readings every few seconds, so only a real change wakes the consumers.
    const temperature: number | undefined = OwnUnifiAirQualitySensor.metricValue(airQuality, 'temperature');
    if (temperature !== undefined) {
      if (temperature !== this._lastReportedTemperature) {
        this._lastReportedTemperature = temperature;
        this.temperatureSensor.temperature = temperature;
      } else {
        // Only the setter refreshes lastSeen, and a stale one makes the sensor discard its value after an hour.
        this.temperatureSensor.lastSeen = Utils.nowMS();
      }
    }
    const humidity: number | undefined = OwnUnifiAirQualitySensor.metricValue(airQuality, 'humidity');
    if (humidity !== undefined && humidity !== this._lastReportedHumidity) {
      this._lastReportedHumidity = humidity;
      this.humiditySensor.humidity = humidity;
    }
    this.airQualitySensor.update({
      aqi: OwnUnifiAirQualitySensor.metricValue(airQuality, 'aqi'),
      co2: OwnUnifiAirQualitySensor.metricValue(airQuality, 'co2'),
      nox: OwnUnifiAirQualitySensor.metricValue(airQuality, 'nox'),
      pm1p0: OwnUnifiAirQualitySensor.metricValue(airQuality, 'pm1p0'),
      pm2p5: OwnUnifiAirQualitySensor.metricValue(airQuality, 'pm2p5'),
      pm4p0: OwnUnifiAirQualitySensor.metricValue(airQuality, 'pm4p0'),
      pm10p0: OwnUnifiAirQualitySensor.metricValue(airQuality, 'pm10p0'),
      tvoc: OwnUnifiAirQualitySensor.metricValue(airQuality, 'tvoc'),
      vape: OwnUnifiAirQualitySensor.metricValue(airQuality, 'vape'),
      voc: OwnUnifiAirQualitySensor.metricValue(airQuality, 'voc'),
    });
  }

  /** @inheritDoc */
  public addAirQualityCallback(pCallback: (action: AirQualitySensorChangeAction) => void): void {
    this.airQualitySensor.addAirQualityCallback(pCallback);
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
    this.airQualitySensor.dispose();
  }

  /**
   * Reads a single metric out of the controllers air quality readings.
   *
   * Kept structural on purpose: the controller reports `nox`, which the library types do not name,
   * and a metric the device does not measure arrives with a `null` value. The value is rounded to one
   * decimal, as the last digits of the raw reading are sensor jitter that would count as a change on
   * every single update.
   * @param airQuality - The air quality readings of the sensor
   * @param metric - The name of the metric to read
   * @returns The measured value, or undefined if the device does not report it
   */
  private static metricValue(airQuality: unknown, metric: string): number | undefined {
    if (typeof airQuality !== 'object' || airQuality === null) {
      return undefined;
    }
    const reading: unknown = Reflect.get(airQuality, metric);
    if (typeof reading !== 'object' || reading === null) {
      return undefined;
    }
    const value: unknown = Reflect.get(reading, 'value');
    return typeof value === 'number' ? Utils.round(value, 1) : undefined;
  }
}
