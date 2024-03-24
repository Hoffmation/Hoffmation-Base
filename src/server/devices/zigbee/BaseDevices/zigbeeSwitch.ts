import { iButtonSwitch } from '../../baseDeviceInterfaces';
import { ZigbeeDevice } from './zigbeeDevice';
import { DeviceType } from '../../deviceType';
import { Button, ButtonPosition, ButtonPressType } from '../../button';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { LogLevel } from '../../../../models';
import { Utils } from '../../../services';

export abstract class ZigbeeSwitch extends ZigbeeDevice implements iButtonSwitch {
  /**
   * The battery level of the device in percent.
   * TODO: Implement iBatteryDevice
   */
  public battery: number = -99;
  public abstract buttonBot: Button | undefined;
  public abstract buttonBotLeft: Button | undefined;
  public abstract buttonBotRight: Button | undefined;
  public abstract buttonMidLeft: Button | undefined;
  public abstract buttonMidRight: Button | undefined;
  public abstract buttonTop: Button | undefined;
  public abstract buttonTopLeft: Button | undefined;
  public abstract buttonTopRight: Button | undefined;

  protected constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven, DeviceCapability.buttonSwitch);
  }

  /** @inheritDoc */
  public persist(buttonName: string, pressType: ButtonPressType): void {
    Utils.dbo?.persistSwitchInput(this, pressType, buttonName);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverrride: boolean = false): void {
    super.update(idSplit, state, initial, pOverrride);
    switch (idSplit[3]) {
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          this.log(LogLevel.Warn, `Das Zigbee Gerät hat unter 20% Batterie.`);
        }
        break;
    }
  }

  public abstract getButtonAssignment(): string;

  /** @inheritDoc */
  public pressButton(position: ButtonPosition, pressType: ButtonPressType): Error | null {
    let taste: Button | undefined;
    switch (position) {
      case ButtonPosition.topLeft:
        taste = this.buttonTopLeft;
        break;
      case ButtonPosition.topRight:
        taste = this.buttonTopRight;
        break;
      case ButtonPosition.midLeft:
        taste = this.buttonMidLeft;
        break;
      case ButtonPosition.midRight:
        taste = this.buttonMidRight;
        break;
      case ButtonPosition.botLeft:
        taste = this.buttonBotLeft;
        break;
      case ButtonPosition.botRight:
        taste = this.buttonBotRight;
        break;
      case ButtonPosition.top:
        taste = this.buttonTop;
        break;
      case ButtonPosition.bottom:
        taste = this.buttonBot;
        break;
      default:
        return new Error(`Unknown Button Position: ${position}`);
    }

    if (taste === undefined) {
      return new Error(`Switch has no Button at position ${position}`);
    }

    const result = taste.press(pressType);
    if (result === null) {
      this.log(LogLevel.Info, `Simulated ButtonPress for ${taste.name} type: ${pressType}`);
    }
    return result;
  }
}
