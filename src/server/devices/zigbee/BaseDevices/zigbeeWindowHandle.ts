import { ZigbeeDevice } from './index';
import { Battery, HandleSensor } from '../../sharedFunctions';
import { iBatteryDevice, iHandleSensor } from '../../baseDeviceInterfaces';
import { DeviceCapability } from '../../DeviceCapability';
import { DeviceType } from '../../deviceType';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { WindowPosition } from '../../models';
import { Window } from '../../groups';
import { HandleChangeAction, LogLevel } from '../../../../models';
import { HandleSettings } from '../../../../models/deviceSettings/handleSettings';

export class ZigbeeWindowHandle extends ZigbeeDevice implements iHandleSensor, iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  /** @inheritDoc */
  public readonly handleSensor: HandleSensor = new HandleSensor(this);
  /** @inheritDoc */
  public settings: HandleSettings = new HandleSettings();

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.handleSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get position(): WindowPosition {
    return this.handleSensor.position;
  }

  /** @inheritDoc */
  public get minutesOpen(): number {
    return this.handleSensor.minutesOpen;
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
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
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    super.update(idSplit, state, initial, pOverride);
    switch (idSplit[3]) {
      case 'position':
        this.handleSensor.updatePosition(this.toWindowPosition(state.val as string));
        break;
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
    }
  }

  private toWindowPosition(val: string): WindowPosition {
    switch (val) {
      case 'up':
        return WindowPosition.tilted;
      case 'right':
      case 'left':
        return WindowPosition.open;
      case 'down':
        return WindowPosition.closed;
    }
    throw new Error(`Unknown window position ${val}`);
  }
}
