import { iHumiditySensor, iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { SmartGardenDevice } from './smartGardenDevice';
import { HumiditySensorChangeAction, TemperatureSensorChangeAction } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { DeviceCapability } from '../DeviceCapability';
import { Utils } from '../../services';
import { TemperatureSensorService } from '../sharedFunctions';

export class SmartGardenSensor extends SmartGardenDevice implements iHumiditySensor, iTemperatureSensor {
  /** @inheritDoc */
  public readonly persistHumiditySensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistHumiditySensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  /** @inheritDoc */
  public temperatureSensorService: TemperatureSensorService = new TemperatureSensorService(this);
  private _humidityCallbacks: ((action: HumiditySensorChangeAction) => void)[] = [];
  private _humidity: number = UNDEFINED_TEMP_VALUE;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.SmartGardenSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this.temperatureSensorService.roomTemperature;
  }

  /** @inheritDoc */
  public set roomTemperature(value: number) {
    this.temperatureSensorService.roomTemperature = value;
  }

  /** @inheritDoc */
  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(new HumiditySensorChangeAction(this, val));
    }
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    return this.temperatureSensorService.temperature;
  }

  /** @inheritDoc */
  public get sTemperature(): string {
    return `${this.temperatureSensorService.temperature}°C`;
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(new HumiditySensorChangeAction(this, this._humidity));
    }
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this.temperatureSensorService.addTempChangeCallback(pCallback);
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public persistHumiditySensor(): void {
    Utils.dbo?.persistHumiditySensor(this);
  }

  /** @inheritDoc */
  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    if (idSplit.length < 6) {
      return;
    }
    const folder: string = idSplit[4];
    const stateName: string = idSplit[5];
    if (folder.indexOf('SERVICE_SENSOR') === 0) {
      switch (stateName) {
        case 'soilHumidity_value':
          this.humidity = state.val as number;
          break;
        case 'soilTemperature_value':
          this.temperatureSensorService.temperature = state.val as number;
          break;
      }
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    this.temperatureSensorService.dispose();
    if (this.persistHumiditySensorInterval) {
      clearInterval(this.persistHumiditySensorInterval);
    }
    super.dispose();
  }
}
