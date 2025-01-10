import { HmIPDevice } from './hmIpDevice';
import { iBatteryDevice, iDisposable, iHandleSensor } from '../../interfaces';
import { Battery, HandleSensor } from '../sharedFunctions';
import { HandleSettings } from '../deviceSettings';
import { DeviceCapability, DeviceType, LogLevel, WindowPosition } from '../../enums';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { HandleChangeAction } from '../../action';
import { Window } from '../groups';

export class HmIpGriff extends HmIPDevice implements iHandleSensor, iBatteryDevice, iDisposable {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  /** @inheritDoc */
  public readonly handleSensor: HandleSensor = new HandleSensor(this);
  /** @inheritDoc */
  public settings: HandleSettings = new HandleSettings();

  /** @inheritDoc */
  public get position(): WindowPosition {
    return this.handleSensor.position;
  }

  /** @inheritDoc */
  public get minutesOpen(): number {
    return this.handleSensor.minutesOpen;
  }

  /**
   * Creates an instance of {@link DeviceType.HmIpGriff}.
   * @param pInfo - Device creation information
   */
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpGriff);
    this.deviceCapabilities.push(DeviceCapability.handleSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  public get window(): Window | undefined {
    return this.handleSensor.window;
  }

  /** @inheritDoc */
  public set window(value: Window) {
    this.handleSensor.window = value;
  }

  /** @inheritDoc */
  public addOffenCallback(pCallback: (pValue: boolean) => void): void {
    this.handleSensor.addOffenCallback(pCallback);
  }

  /** @inheritDoc */
  public addKippCallback(pCallback: (pValue: boolean) => void): void {
    this.handleSensor.addKippCallback(pCallback);
  }

  /** @inheritDoc */
  public addClosedCallback(pCallback: (pValue: boolean) => void): void {
    this.handleSensor.addClosedCallback(pCallback);
  }

  /** @inheritDoc */
  public addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void {
    this.handleSensor.addHandleChangeCallback(cb);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Griff Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this.battery.level = 100 * (((state.val as number) - 0.9) / 0.6);
            break;
        }
        break;
      case '1':
        switch (idSplit[4]) {
          case 'STATE':
            this.handleSensor.updatePosition(state.val as WindowPosition);
            break;
          case 'OPERATING_VOLTAGE':
            this.battery.level = 100 * (((state.val as number) - 0.9) / 0.6);
            break;
        }
        break;
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    this.handleSensor.dispose();
  }
}
