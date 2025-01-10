import { iJsonOmitKeys } from '../iJsonOmitKeys';
import { HumiditySensorChangeAction } from '../../action';

export interface iHumiditySensor extends iJsonOmitKeys {
  humidity: number;

  dispose(): void;

  persist(): void;

  addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void;

  toJSON(): Partial<iHumiditySensor>;
}
