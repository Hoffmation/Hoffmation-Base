import { ZigbeeDevice } from './BaseDevices';
import { iTemperaturSensor } from '../iTemperaturSensor';
import { iHumiditySensor } from '../iHumiditySensor';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeSonoffTemp extends ZigbeeDevice implements iTemperaturSensor, iHumiditySensor {
  private _humidityCallbacks: ((pValue: number) => void)[] = [];
  private _temperatur: number = -99;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffTemp);
  }

  private _humidity: number = -99;

  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(val);
    }
  }

  public get iTemperatur(): number {
    return this._temperatur;
  }

  public get sTemperatur(): string {
    return `${this._temperatur}°C`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'humidity':
        this.humidity = state.val as number;
        break;
      case 'temperatur':
        this._temperatur = state.val as number;
        break;
    }
  }

  public addHumidityCallback(pCallback: (pValue: number) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(this._humidity);
    }
  }
}
