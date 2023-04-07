import { iVictronSettings } from '../../config';
import { VictronDeviceData, VictronMqttConnectionOptions } from 'victron-mqtt-consumer';
import { VictronDevice } from './victron-device';

export class VictronService {
  private static _settings: iVictronSettings | undefined = undefined;

  private static _victronDevice: VictronDevice | undefined = undefined;

  public static get settings(): iVictronSettings | undefined {
    return this._settings;
  }

  public static get data(): VictronDeviceData | undefined {
    return this._victronDevice?.victronConsumer.data;
  }

  private static _active: boolean;

  public static get active(): boolean {
    return this._active;
  }

  public static initialize(settings?: iVictronSettings): void {
    const newSettings: iVictronSettings | undefined = settings ?? this.settings;
    if (newSettings === undefined) {
      this._active = false;
      return;
    }
    const opts = new VictronMqttConnectionOptions();
    opts.ip = newSettings.host;
    opts.influxDb = newSettings.influxDb;
    this._victronDevice = new VictronDevice(opts);
  }
}
