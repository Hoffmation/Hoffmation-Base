import { Utils, WeatherService } from '../../services';
import { iJsonOmitKeys, TemperatureSensorChangeAction } from '../../../models';
import { iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';

export class TemperatureSensor implements iJsonOmitKeys {
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = ['_device'];
  /**
   * The current room temperature as a number in Celsius
   */
  public roomTemperature: number = UNDEFINED_TEMP_VALUE;
  /**
   * Temperature correction coefficient to mitigate outdoor temperature, e.g. if this is closely placed to a window.
   * @remarks Default: 0 and difference to 21°C
   * @example With outdoor temp of 10°C and a coefficient of 0.5, the temperature correction will be +5.5°C
   */
  public outdoorTemperatureCorrectionCoefficient: number = 0;
  /**
   * The interval to persist the temperature sensor information
   */
  private readonly _persistTemperatureSensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persist();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  private _temperature: number = UNDEFINED_TEMP_VALUE;
  private _temperaturCallbacks: ((action: TemperatureSensorChangeAction) => void)[] = [];
  /**
   * The last time the temperature sensor was seen.
   */
  public lastSeen: number = 0;

  public constructor(private readonly _device: iTemperatureSensor) {}

  public get temperature(): number {
    if (Utils.nowMS() - this.lastSeen > 60 * 60 * 1000) {
      // Temperature sensor hasn't been seen in an hour --> Don't to trust it
      return UNDEFINED_TEMP_VALUE;
    }
    return this._temperature;
  }

  public set temperature(val: number) {
    this.lastSeen = Utils.nowMS();
    let correctedValue: number = val;
    if (this.outdoorTemperatureCorrectionCoefficient !== 0 && WeatherService.currentTemp !== UNDEFINED_TEMP_VALUE) {
      correctedValue = val + this.outdoorTemperatureCorrectionCoefficient * (21 - WeatherService.currentTemp);
    }
    this._temperature = correctedValue;
    for (const cb of this._temperaturCallbacks) {
      cb(new TemperatureSensorChangeAction(this._device, correctedValue));
    }
  }

  /**
   * Persists the current temperature sensor information to the database
   */
  public persist(): void {
    Utils.dbo?.persistTemperatureSensor(this._device);
  }

  /**
   * Adds a callback to be called when the temperature changes
   * @param pCallback - The callback to be called
   */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this._temperaturCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(new TemperatureSensorChangeAction(this._device, this._temperature));
    }
  }

  public dispose(): void {
    if (this._persistTemperatureSensorInterval) {
      clearInterval(this._persistTemperatureSensorInterval);
    }
  }

  public toJSON(): Partial<TemperatureSensor> {
    return Utils.jsonFilter(this, this.jsonOmitKeys);
  }
}
