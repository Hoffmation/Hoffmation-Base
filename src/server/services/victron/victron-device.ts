import { VictronDeviceData, VictronMqttConnectionOptions, VictronMqttConsumer } from 'victron-mqtt-consumer';

export class VictronDevice {
  private readonly _victronConsumer: VictronMqttConsumer;

  public constructor(opts: VictronMqttConnectionOptions) {
    this._victronConsumer = new VictronMqttConsumer(opts);
  }

  public get victronConsumer(): VictronMqttConsumer {
    return this._victronConsumer;
  }

  public get data(): VictronDeviceData {
    return this._victronConsumer.data;
  }
}
