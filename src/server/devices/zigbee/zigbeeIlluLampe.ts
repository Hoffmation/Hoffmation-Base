import { DeviceType } from '../deviceType';
import { ZigbeeIlluActuator } from './zigbeeIlluActuator';
import { LampSetLightCommand, LampSetTimeBasedCommand, LampToggleLightCommand, LogLevel } from '../../../models';
import { iLamp } from '../baseDeviceInterfaces';
import { Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { LampUtils } from '../sharedFunctions';

export class ZigbeeIlluLampe extends ZigbeeIlluActuator implements iLamp {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
  }

  /** @inheritDoc */
  public get lightOn(): boolean {
    return super.actuatorOn;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        this.log(LogLevel.Trace, `Lampen Update für ${this.info.customName} auf ${state.val}`);
        break;
    }
  }

  /** @inheritdoc */
  public setLight(c: LampSetLightCommand): void {
    super.setActuator(c);
  }

  /** @inheritDoc */
  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  /** @inheritDoc */
  public setTimeBased(c: LampSetTimeBasedCommand): void {
    LampUtils.setTimeBased(this, c);
  }

  /** @inheritDoc */
  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }
}
