import {
  iAirQualityCollector,
  iAirQualityReadings,
  iAirQualitySensor,
  UNDEFINED_AIR_QUALITY_VALUE,
} from '../../interfaces';
import { AirQualitySensorChangeAction } from '../../action';
import { Utils } from '../../utils';
import { Persistence } from '../../services';

export class AirQualitySensor implements iAirQualitySensor {
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = ['_device'];
  /** @inheritDoc */
  public lastSeen: number = 0;
  private readonly _readings: iAirQualityReadings = {
    aqi: UNDEFINED_AIR_QUALITY_VALUE,
    co2: UNDEFINED_AIR_QUALITY_VALUE,
    nox: UNDEFINED_AIR_QUALITY_VALUE,
    pm1p0: UNDEFINED_AIR_QUALITY_VALUE,
    pm2p5: UNDEFINED_AIR_QUALITY_VALUE,
    pm4p0: UNDEFINED_AIR_QUALITY_VALUE,
    pm10p0: UNDEFINED_AIR_QUALITY_VALUE,
    tvoc: UNDEFINED_AIR_QUALITY_VALUE,
    vape: UNDEFINED_AIR_QUALITY_VALUE,
    voc: UNDEFINED_AIR_QUALITY_VALUE,
  };
  private _airQualityCallbacks: ((action: AirQualitySensorChangeAction) => void)[] = [];
  private readonly _persistAirQualitySensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persist();
    },
    5 * 60 * 1000,
    this,
    false,
  );

  public constructor(private readonly _device: iAirQualityCollector) {}

  /** @inheritDoc */
  public get readings(): iAirQualityReadings {
    return { ...this._readings };
  }

  /** @inheritDoc */
  public update(readings: Partial<iAirQualityReadings>): void {
    this.lastSeen = Utils.nowMS();
    let changed: boolean = false;
    for (const [key, value] of Object.entries(readings) as [keyof iAirQualityReadings, number | undefined][]) {
      if (value === undefined || this._readings[key] === value) {
        continue;
      }
      this._readings[key] = value;
      changed = true;
    }
    if (!changed) {
      // The controller repeats unchanged readings every few seconds --> don't bother the consumers with those.
      return;
    }
    const snapshot: iAirQualityReadings = this.readings;
    for (const cb of this._airQualityCallbacks) {
      cb(new AirQualitySensorChangeAction(this._device, snapshot));
    }
  }

  /** @inheritDoc */
  public reports(metric: keyof iAirQualityReadings): boolean {
    return this._readings[metric] !== UNDEFINED_AIR_QUALITY_VALUE;
  }

  /** @inheritDoc */
  public persist(): void {
    if (this.lastSeen === 0) {
      // Nothing was ever reported --> persisting would only write a row of undefined values.
      return;
    }
    Persistence.dbo?.persistAirQualitySensor(this._device);
  }

  /** @inheritDoc */
  public addAirQualityCallback(pCallback: (action: AirQualitySensorChangeAction) => void): void {
    this._airQualityCallbacks.push(pCallback);
    if (this.lastSeen > 0) {
      pCallback(new AirQualitySensorChangeAction(this._device, this.readings));
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this._persistAirQualitySensorInterval) {
      clearInterval(this._persistAirQualitySensorInterval);
    }
  }

  /** @inheritDoc */
  public toJSON(): Partial<AirQualitySensor> {
    return Utils.jsonFilter(this, this.jsonOmitKeys);
  }
}
