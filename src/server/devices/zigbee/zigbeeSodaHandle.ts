import { ZigbeeWindowHandle } from './BaseDevices';
import { iHumiditySensor, iTemperatureSensor } from '../baseDeviceInterfaces';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { HumiditySensor, TemperatureSensor } from '../sharedFunctions';
import {
  CommandSource,
  HumiditySensorChangeAction,
  LogLevel,
  TemperatureSensorChangeAction,
  WindowSetDesiredPositionCommand,
} from '../../../models';

export class ZigbeeSodaHandle extends ZigbeeWindowHandle implements iTemperatureSensor, iHumiditySensor {
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);
  /** @inheritDoc */
  public humiditySensor: HumiditySensor = new HumiditySensor(this);

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSodaHandle);
    this.deviceCapabilities.push(DeviceCapability.humiditySensor);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this.temperatureSensor.roomTemperature;
  }

  /** @inheritDoc */
  public set roomTemperature(value: number) {
    this.temperatureSensor.roomTemperature = value;
  }

  /** @inheritDoc */
  public get humidity(): number {
    return this.humiditySensor.humidity;
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    return this.temperatureSensor.temperature;
  }

  /** @inheritDoc */
  public get sTemperature(): string {
    return `${this.temperatureSensor.temperature}°C`;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'humidity':
        this.humiditySensor.humidity = state.val as number;
        break;
      case 'temperature':
        this.temperatureSensor.temperature = state.val as number;
        break;
      case 'button_left':
        if (!initial && (state.val as string) === 'pressed') {
          this.onButtonLeftPressed();
        }
        break;
      case 'button_right':
        if (!initial && (state.val as string) === 'pressed') {
          this.onButtonRightPressed();
        }
        break;
    }
  }

  /** @inheritDoc */
  public addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void {
    this.humiditySensor.addHumidityCallback(pCallback);
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this.temperatureSensor.addTempChangeCallback(pCallback);
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public dispose(): void {
    this.temperatureSensor.dispose();
    this.humiditySensor.dispose();
    super.dispose();
  }

  private onButtonLeftPressed(): void {
    this.log(LogLevel.Info, 'Button left pressed');
    if (!this.window) {
      return;
    }
    const command: WindowSetDesiredPositionCommand = new WindowSetDesiredPositionCommand(
      CommandSource.Manual,
      100,
      'Button on handle was pressed',
    );
    this.window.setDesiredPosition(command);
  }

  private onButtonRightPressed(): void {
    this.log(LogLevel.Info, 'Button right pressed');
    if (!this.window) {
      return;
    }
    const command: WindowSetDesiredPositionCommand = new WindowSetDesiredPositionCommand(
      CommandSource.Manual,
      0,
      'Button on handle was pressed',
    );
    this.window.setDesiredPosition(command);
  }
}
