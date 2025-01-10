import { iHumiditySensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { iJsonOmitKeys } from '../../models/iJsonOmitKeys';
import { Utils } from '../../utils/utils';
import { HumiditySensorChangeAction } from '../../models/action';

export class HumiditySensor implements iJsonOmitKeys {
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = ['_device'];
  private _humidityCallbacks: ((action: HumiditySensorChangeAction) => void)[] = [];
  private _humidity: number = UNDEFINED_TEMP_VALUE;
  private readonly _persistHumiditySensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persist();
    },
    5 * 60 * 1000,
    this,
    false,
  );

  public constructor(private readonly _device: iHumiditySensor) {}

  public get humidity(): number {
    return this._humidity;
  }

  public set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(new HumiditySensorChangeAction(this._device, val));
    }
  }

  public dispose(): void {
    if (this._persistHumiditySensorInterval) {
      clearInterval(this._persistHumiditySensorInterval);
    }
  }

  public persist(): void {
    Utils.dbo?.persistHumiditySensor(this._device);
  }

  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(new HumiditySensorChangeAction(this._device, this._humidity));
    }
  }

  public toJSON(): Partial<HumiditySensor> {
    return Utils.jsonFilter(this, this.jsonOmitKeys);
  }
}
