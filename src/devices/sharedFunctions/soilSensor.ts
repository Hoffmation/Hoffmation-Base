import { iSoilCollector, iSoilSensor, UNDEFINED_SOIL_MOISTURE_VALUE } from '../../interfaces';
import { SoilSensorChangeAction } from '../../action';
import { Utils } from '../../utils';
import { Persistence } from '../../services';

export class SoilSensor implements iSoilSensor {
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = ['_device'];
  private _soilMoistureCallbacks: ((action: SoilSensorChangeAction) => void)[] = [];
  private _soilMoisture: number = UNDEFINED_SOIL_MOISTURE_VALUE;
  private readonly _persistSoilSensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persist();
    },
    5 * 60 * 1000,
    this,
    false,
  );

  public constructor(private readonly _device: iSoilCollector) {}

  /** @inheritDoc */
  public get soilMoisture(): number {
    return this._soilMoisture;
  }

  /** @inheritDoc */
  public set soilMoisture(val: number) {
    this._soilMoisture = val;
    for (const cb of this._soilMoistureCallbacks) {
      cb(new SoilSensorChangeAction(this._device, val));
    }
  }

  /** @inheritDoc */
  public persist(): void {
    if (this._soilMoisture === UNDEFINED_SOIL_MOISTURE_VALUE) {
      // Nothing was ever reported --> persisting would only write a row of the sentinel, which reads like a
      // measured -1 % in every later query.
      return;
    }
    Persistence.dbo?.persistSoilSensor(this._device);
  }

  /** @inheritDoc */
  public addSoilMoistureCallback(pCallback: (action: SoilSensorChangeAction) => void): void {
    this._soilMoistureCallbacks.push(pCallback);
    if (this._soilMoisture !== UNDEFINED_SOIL_MOISTURE_VALUE) {
      pCallback(new SoilSensorChangeAction(this._device, this._soilMoisture));
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this._persistSoilSensorInterval) {
      clearInterval(this._persistSoilSensorInterval);
    }
  }

  /** @inheritDoc */
  public toJSON(): Partial<SoilSensor> {
    return Utils.jsonFilter(this, this.jsonOmitKeys);
  }
}
