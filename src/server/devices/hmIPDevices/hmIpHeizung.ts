import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models';
import { HmIPDevice } from './hmIpDevice';

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

export class HmIpHeizung extends HmIPDevice {
  private _temperatur: number = 0;
  private _level: number = 0;
  private _adaptionState: HmIpHeizungAdaptionStates | undefined;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizung);
  }

  private _desiredTemperatur: number = 0;

  get desiredTemperatur(): number {
    return this._desiredTemperatur;
  }

  get iLevel(): number {
    return this._level;
  }

  get iTemperatur(): number {
    return this._temperatur;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Heizung Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
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
