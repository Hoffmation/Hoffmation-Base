import { ZigbeeHeater } from './BaseDevices';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';
import { UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { LogLevel } from '../../../models';
import { Utils } from '../../services';

export class ZigbeeTuyaValve extends ZigbeeHeater {
  private _setLocalTempCalibrationId: string;
  private _targetTempVal: number = UNDEFINED_TEMP_VALUE;
  private _localTempVal: number = UNDEFINED_TEMP_VALUE;
  private _localDiffTempVal: number = 0;
  private _setModeId: string;
  private _mode: string = '';

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeTuyaValve);
    this._setPointTemperaturID = `${this.info.fullID}.target_temperature`;
    this._setLocalTempCalibrationId = `${this.info.fullID}.local_temp_calibration`;
    this._setModeId = `${this.info.fullID}.mode`;
  }

  public override set seasonTurnOff(value: boolean) {
    this._seasonTurnOff = value;
    this.setMode(value ? 'off' : 'auto');
  }

  public override set roomTemperatur(value: number) {
    this._roomTemperatur = value;
    if (this.settings.useOwnTemperatur) {
      return;
    }
    this.checkTempDiff();
  }

  public override set desiredTemperatur(val: number) {
    this._desiredTemperatur = val;
    this.checkTempDiff();
  }

  private get tempDiff(): number {
    return this._targetTempVal - (this._localTempVal + this._localDiffTempVal);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    switch (idSplit[3]) {
      case 'valve_position':
        this.log(LogLevel.Trace, `Tuya Valve valve_position Update for ${this.info.customName} to "${state.val}"`);
        this._level = state.val as number;
        break;
      case 'local_temp':
        this.log(LogLevel.Trace, `Tuya Valve Local_Temp Update for ${this.info.customName} to "${state.val}"`);
        this._localTempVal = state.val as number;
        if (!initial) this.checkTempDiff();
        break;
      case 'local_temp_calibration':
        this.log(LogLevel.Trace, `Tuya Valve Local_Temp_calib Update for ${this.info.customName} to "${state.val}"`);
        this._localDiffTempVal = state.val as number;
        if (!initial) this.checkTempDiff();
        break;
      case 'mode':
        this.log(LogLevel.Trace, `Tuya Valve mode Update for ${this.info.customName} to "${state.val}"`);
        this._mode = state.val as string;
        if (!this.settings.seasonalTurnOffActive && this._mode !== 'auto') {
          this.setMode('auto');
        }
        break;
      case 'target_temperature':
        this.log(LogLevel.Trace, `Tuya Valve Target_Temp Update for ${this.info.customName} to "${state.val}"`);
        this._targetTempVal = state.val as number;
        if (!initial) this.checkTempDiff();
        break;
    }

    super.update(idSplit, state, initial, true);
  }

  private checkTempDiff(): void {
    if (this.settings.useOwnTemperatur) {
      return;
    }
    const desiredDiff: number = Utils.round(this.desiredTemperatur - this._roomTemperatur, 1);
    const currentDiff: number = this.tempDiff;
    const missingDiff: number = Utils.round(desiredDiff - currentDiff, 1);
    if (Math.abs(missingDiff) < 0.15) {
      // Desired diff is already properly established
      return;
    }
    this.log(
      LogLevel.Debug,
      `Calculating Tuya Valve Diff, desiredDiff "${desiredDiff}", currentDiff "${currentDiff}", missingDiff "${missingDiff}"`,
    );
    if (Math.abs(desiredDiff) <= 9.0) {
      // Check possible with local Diff only
      this.setTargetTemperatur(this.desiredTemperatur);
      this.setLocalDiff(-1 * desiredDiff);
      return;
    }
    const newLocalDiff: number = Math.sign(desiredDiff) * -9;
    this.setLocalDiff(newLocalDiff);
    this.setTargetTemperatur(this._localTempVal + this._roomTemperatur + newLocalDiff + this.desiredTemperatur);
  }

  private setLocalDiff(newLocalDiff: number): void {
    this.log(LogLevel.Debug, `Setting new Local Calibration Diff (${newLocalDiff}) for Tuya Valve`);
    this.setState(this._setLocalTempCalibrationId, newLocalDiff);
  }

  private setTargetTemperatur(targetTemp: number): void {
    this.log(LogLevel.Debug, `Setting new Target Temp (${targetTemp}) for Tuya Valve`);
    this.setState(this._setPointTemperaturID, targetTemp);
  }

  private setMode(targetMode: 'auto' | 'off' | 'heat'): void {
    this.setState(this._setModeId, targetMode);
  }
}
