import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogDebugType, Utils } from '../../services';
import { ActuatorSettings, CollisionSolving, LogLevel, TimeOfDay } from '../../../models';
import { iLamp, iTemporaryDisableAutomatic } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { LampUtils } from '../sharedFunctions';

export class HmIpLampe extends HmIPDevice implements iLamp, iTemporaryDisableAutomatic {
  public lightOn: boolean = false;
  public settings: ActuatorSettings = new ActuatorSettings();
  private lightOnSwitchID: string = '';
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public queuedValue: boolean | null = null;
  public targetAutomaticState: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.lightOnSwitchID = `${this.info.fullID}.2.STATE`;
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public get actuatorOn(): boolean {
    return this.lightOn;
  }

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this.targetAutomaticState);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Lampen Update : ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    this.queuedValue = null;
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '1':
        if (idSplit[4] === 'STATE') {
          this.lightOn = state.val as boolean;
          this.persist();
        }
        break;
    }
  }

  public setActuator(pValue: boolean, timeout?: number, force?: boolean): void {
    this.setLight(pValue, timeout, force);
  }

  public toggleActuator(force: boolean): boolean {
    return this.toggleLight(undefined, force);
  }

  /** @inheritdoc */
  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (LampUtils.checkBlockActive(this, force, pValue)) {
      return;
    }
    if (LampUtils.checkUnchanged(this, force, pValue)) {
      return;
    }
    if (this.lightOnSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    this.log(LogLevel.Debug, `Set Light Acutator to "${pValue}"`, LogDebugType.SetActuator);
    this.queuedValue = pValue;
    this.setState(this.lightOnSwitchID, pValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });

    if (this.settings.isStromStoss && pValue) {
      timeout = 3000;
      LampUtils.stromStossOn(this);
    }

    if (timeout < 0 || !pValue) {
      return;
    }

    if (timeout > -1) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    return LampUtils.toggleLight(this, time, force, calculateTime);
  }

  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    LampUtils.setTimeBased(this, time, timeout, force);
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }
}
