import { iVictronSettings } from '../config';
import { VictronMqttConsumer } from 'victron-mqtt-consumer/build/src/main';
import { VictronMqttConnectionOptions } from 'victron-mqtt-consumer/build/src/models/VictronMqttConnectionOptions';
import { VictronDeviceData } from 'victron-mqtt-consumer/build/src/models/VictronDeviceData';

export class VictronService {
  private static _victronConsumer: VictronMqttConsumer | undefined = undefined;

  private static _settings: iVictronSettings | undefined = undefined;

  public static get settings(): iVictronSettings | undefined {
    return this._settings;
  }

  public static get data(): VictronDeviceData | undefined {
    return this._victronConsumer?.data;
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
    this._victronConsumer = new VictronMqttConsumer(opts);
  }
}
