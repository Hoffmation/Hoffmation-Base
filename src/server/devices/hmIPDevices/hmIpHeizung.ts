import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';
import { HmIPDevice } from './hmIpDevice';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { iBatteryDevice } from '../baseDeviceInterfaces';
import { DeviceCapability } from '../DeviceCapability';
import { Battery } from '../sharedFunctions';

enum HmIpHeizungAdaptionStates {
  StateNotAvailable = 0,
  RunToStart = 1,
  WaitForAdaption = 2,
  AdaptionInProgress = 3,
  AdaptionDone = 4,
  TooTight = 5,
  AdjustmentTooBig = 6,
  AdjustmentTooSmall = 7,
  ErrorPosition = 8,
}

export class HmIpHeizung extends HmIPDevice implements iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  private _temperatur: number = 0;
  private _level: number = 0;
  private _adaptionState: HmIpHeizungAdaptionStates | undefined;
  private _desiredTemperatur: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizung);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  public get batteryLevel(): number {
    return this.battery.level;
  }

  get desiredTemperatur(): number {
    return this._desiredTemperatur;
  }

  get iLevel(): number {
    return this._level;
  }

  get iTemperatur(): number {
    return this._temperatur;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Heizung Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this.battery.level = 100 * (((state.val as number) - 1.8) / 1.2);
            break;
        }
        break;
      case '1':
        this.updateBaseInformation(idSplit[4], state);
        break;
    }
  }

  private updateBaseInformation(name: string, state: ioBroker.State) {
    switch (name) {
      case 'ACTUAL_TEMPERATURE':
        this._temperatur = state.val as number;
        break;
      case 'LEVEL':
        this._level = state.val as number;
        break;
      case 'VALVE_STATE':
        this._adaptionState = state.val as HmIpHeizungAdaptionStates;
        if (
          this._adaptionState !== HmIpHeizungAdaptionStates.AdaptionInProgress &&
          this._adaptionState !== HmIpHeizungAdaptionStates.AdaptionDone
        ) {
          this.log(LogLevel.Alert, `Akward adaption state: ${HmIpHeizungAdaptionStates[this._adaptionState]}`);
        }
        break;
      case 'SET_POINT_TEMPERATURE':
        this.log(LogLevel.Trace, `Heizung Update Soll-Temperatur JSON: ${JSON.stringify(state)}`);
        this._desiredTemperatur = state.val as number;
        break;
    }
  }
}
