import { ZigbeeHeater } from './BaseDevices';
import { DeviceType } from '../deviceType';
import { UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { LogLevel } from '../../../models';
import { Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeEuroHeater extends ZigbeeHeater {
  private _setLocalTempCalibrationId: string;
  private _targetTempVal: number = UNDEFINED_TEMP_VALUE;
  private _localTempVal: number = UNDEFINED_TEMP_VALUE;
  private _localDiffTempVal: number = 0;
  private _setModeId: string;
  private _valvePosId: string;

  private _mode: 1 | 2 = 1;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeEuroHeater);
    this._setPointTemperaturID = `${this.info.fullID}.heating_setpnt_current`;
    this._setLocalTempCalibrationId = `${this.info.fullID}.local_temp_calibration`;
    this._setModeId = `${this.info.fullID}.spz_trv_mode`;
    this._valvePosId = `${this.info.fullID}.valve_position`;
  }

  public override set seasonTurnOff(value: boolean) {
    this._seasonTurnOff = value;
    if (value) {
      this.setMode(1);
      this.setValve(0);
      return;
    }
    this.setMode(this.settings.controlByPid ? 1 : 2);
  }

  public override set roomTemperatur(value: number) {
    this._roomTemperatur = value;
    if (this.settings.controlByPid) {
      //TODO: Implement PID controlling
      return;
    }
    if (this.settings.useOwnTemperatur) {
      return;
    }
    this.checkTempDiff();
  }

  public override get desiredTemperature(): number {
    return this._desiredTemperatur;
  }

  public override set desiredTemperature(val: number) {
    this._desiredTemperatur = val;
    this.checkTempDiff();
  }

  private get tempDiff(): number {
    return this._targetTempVal - (this._localTempVal + this._localDiffTempVal);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    switch (idSplit[3]) {
      case 'valve_position':
        this.log(LogLevel.Trace, `Euro Valve valve_position Update for ${this.info.customName} to "${state.val}"`);
        this._level = state.val as number;
        break;
      case 'local_temp':
        this.log(LogLevel.Trace, `Euro Valve Local_Temp Update for ${this.info.customName} to "${state.val}"`);
        this._localTempVal = state.val as number;
        if (!initial) this.checkTempDiff();
        break;
      case 'local_temp_calibration':
        this.log(LogLevel.Trace, `Euro Valve Local_Temp_calib Update for ${this.info.customName} to "${state.val}"`);
        this._localDiffTempVal = state.val as number;
        if (!initial) this.checkTempDiff();
        break;
      case 'spz_trv_mode':
        this.log(LogLevel.Trace, `Euro Valve mode Update for ${this.info.customName} to "${state.val}"`);
        this._mode = state.val as 1 | 2;
        if (!this.settings.seasonalTurnOffActive) {
          if (this.settings.controlByPid && this._mode == 2) {
            this.setMode(1);
          } else if (this._mode == 1) {
            this.setMode(2);
          }
        }
        break;
      case 'target_temperature':
        this.log(LogLevel.Trace, `Euro Valve Target_Temp Update for ${this.info.customName} to "${state.val}"`);
        this._targetTempVal = state.val as number;
        if (!initial) this.checkTempDiff();
        break;
    }

    super.update(idSplit, state, initial, true);
  }

  private checkTempDiff(): void {
    if (this.settings.useOwnTemperatur || this.seasonTurnOff) {
      return;
    }
    const desiredDiff: number = Utils.round(this.desiredTemperature - this._roomTemperatur, 1);
    const currentDiff: number = this.tempDiff;
    const missingDiff: number = Utils.round(desiredDiff - currentDiff, 1);
    if (Math.abs(missingDiff) < 0.15) {
      // Desired diff is already properly established
      return;
    }
    this.log(
      LogLevel.Debug,
      `Calculating Euro Valve Diff, desiredDiff "${desiredDiff}", currentDiff "${currentDiff}", missingDiff "${missingDiff}"`,
    );
    if (Math.abs(desiredDiff) <= 9.0) {
      // Check possible with local Diff only
      this.setTargetTemperatur(this.desiredTemperature);
      this.setLocalDiff(-1 * desiredDiff);
      return;
    }
    const newLocalDiff: number = Math.sign(desiredDiff) * -9;
    this.setLocalDiff(newLocalDiff);
    this.setTargetTemperatur(this._localTempVal + this._roomTemperatur + newLocalDiff + this.desiredTemperature);
  }

  private setLocalDiff(newLocalDiff: number): void {
    this.log(LogLevel.Debug, `Setting new Local Calibration Diff (${newLocalDiff}) for Euro Valve`);
    this.setState(this._setLocalTempCalibrationId, newLocalDiff);
  }

  private setTargetTemperatur(targetTemp: number): void {
    this.log(LogLevel.Debug, `Setting new Target Temp (${targetTemp}) for Euro Valve`);
    this.setState(this._setPointTemperaturID, targetTemp);
  }

  /**
   * Sets the mode (1 = manual valve, 2 = automatic temp based)
   * @param {1 | 2} targetMode
   * @private
   */
  private setMode(targetMode: 1 | 2): void {
    this.setState(this._setModeId, targetMode);
  }

  private setValve(target: number): void {
    this.setState(this._valvePosId, target);
  }
}
