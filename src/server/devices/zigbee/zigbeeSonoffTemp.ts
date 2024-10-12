import { ZigbeeDevice } from './BaseDevices';
import { iBatteryDevice, iHumiditySensor, iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import {
  BatteryLevelChangeAction,
  HumiditySensorChangeAction,
  LogLevel,
  TemperatureSensorChangeAction,
} from '../../../models';
import { Utils } from '../../services';
import { TemperatureSensorService } from '../sharedFunctions';

export class ZigbeeSonoffTemp extends ZigbeeDevice implements iTemperatureSensor, iHumiditySensor, iBatteryDevice {
  /** @inheritDoc */
  public temperatureSensorService: TemperatureSensorService = new TemperatureSensorService(this);

  /** @inheritDoc */
  public readonly persistHumiditySensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistHumiditySensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  private _humidityCallbacks: ((action: HumiditySensorChangeAction) => void)[] = [];
  private _humidity: number = UNDEFINED_TEMP_VALUE;
  private _lastBatteryLevel: number = -1;
  private _batteryLevelCallbacks: Array<(action: BatteryLevelChangeAction) => void> = [];

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffTemp);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  /** @inheritDoc */
  public get battery(): number {
    return this._battery;
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
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this._batteryLevelCallbacks.push(pCallback);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this._battery = state.val as number;
        this.checkForBatteryChange();
        this.persistBatteryDevice();
        if (this._battery < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
      case 'humidity':
        this.humidity = state.val as number;
        break;
      case 'temperature':
        this.temperatureSensorService.temperature = state.val as number;
        break;
    }
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
  public persistTemperaturSensor(): void {
    this.temperatureSensorService.persist();
  }

  /** @inheritDoc */
  public persistHumiditySensor(): void {
    Utils.dbo?.persistHumiditySensor(this);
  }

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  /** @inheritDoc */
  public dispose(): void {
    this.temperatureSensorService.dispose();
    if (this.persistHumiditySensorInterval) {
      clearInterval(this.persistHumiditySensorInterval);
    }
    super.dispose();
  }

  /**
   * Checks whether the battery level did change and if so fires the callbacks
   */
  private checkForBatteryChange(): void {
    const newLevel: number = this.battery;
    if (newLevel == -1 || newLevel == this._lastBatteryLevel) {
      return;
    }
    for (const cb of this._batteryLevelCallbacks) {
      cb(new BatteryLevelChangeAction(this));
    }
    this._lastBatteryLevel = newLevel;
  }
}
