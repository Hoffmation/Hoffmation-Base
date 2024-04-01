import { ZigbeeActuator } from './ZigbeeActuator';
import { iLamp, iTemporaryDisableAutomatic } from '../../baseDeviceInterfaces';
import { LampSetLightCommand, LampSetTimeBasedCommand, LampToggleLightCommand, LogLevel } from '../../../../models';
import { LampUtils } from '../../sharedFunctions';
import { DeviceCapability } from '../../DeviceCapability';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceType } from '../../deviceType';

export abstract class ZigbeeLamp extends ZigbeeActuator implements iLamp, iTemporaryDisableAutomatic {
  protected abstract readonly _stateNameState: string;
  protected _lightOn: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.lamp);
  }

  /** @inheritDoc */
  public get lightOn(): boolean {
    return this._lightOn;
  }

  /** @inheritDoc */
  public update(
    idSplit: string[],
    state: ioBroker.State,
    initial: boolean = false,
    handledByChildObject: boolean = false,
  ): void {
    if (!handledByChildObject) {
      this.log(LogLevel.DeepTrace, `Aktuator Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    }
    this.queuedValue = null;
    this.log(LogLevel.DeepTrace, `Dimmer Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case this._stateNameState:
        this.log(LogLevel.Trace, `Lamp Update für ${this.info.customName} auf ${state.val}`);
        this._lightOn = state.val as boolean;
        this.persist();
        break;
    }
  }

  /** @inheritDoc */
  public setTimeBased(c: LampSetTimeBasedCommand): void {
    LampUtils.setTimeBased(this, c);
  }

  /** @inheritdoc */
  public setLight(c: LampSetLightCommand): void {
    super.setActuator(c);
  }

  /** @inheritDoc */
  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }
}
