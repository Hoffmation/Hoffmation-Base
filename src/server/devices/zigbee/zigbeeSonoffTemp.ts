import { ZigbeeDevice } from './zigbeeDevice';
import { iTemperaturSensor } from '../iTemperaturSensor';
import { iHumiditySensor } from '../iHumiditySensor';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeSonoffTemp extends ZigbeeDevice implements iTemperaturSensor, iHumiditySensor {
  private _humidity: number = -99;
  private _temperatur: number = -99;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffTemp);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    super.update(idSplit, state, initial, pOverride);
    switch (idSplit[3]) {
      case 'humidity':
        this._humidity = state.val as number;
        break;
      case 'temperatur':
        this._temperatur = state.val as number;
        break;
    }
  }

  public get humidity(): number {
    return this._humidity;
  }
  public get iTemperatur(): number {
    return this._temperatur;
  }
  public get sTemperatur(): string {
    return `${this._temperatur}°C`;
  }
}
