import { LogLevel } from 'index';
import { ServerLogService } from 'index';
import { HmIPDevice } from 'index';
import { DeviceType } from 'index';
import { DeviceInfo } from 'index';

export class HmIpHeizung extends HmIPDevice {
  private _temperatur: number = 0;
  private _level: number = 0;
  private _adaptionState: number | undefined;
  private _desiredTemperatur: number = 0;

  public get desiredTemperatur(): number {
    return this._desiredTemperatur;
  }

  public get iLevel(): number {
    return this._level;
  }

  public get iTemperatur(): number {
    return this._temperatur;
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizung);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Heizung "${this.info.customName}" Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
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
        this._adaptionState = state.val as number;
        if (this._adaptionState !== 4) {
          ServerLogService.writeLog(
            LogLevel.Alert,
            `Adaption State für Heizung "${this.info.customName}" ungewöhnlich: ${this._adaptionState}`,
          );
        }
        break;
      case 'SET_POINT_TEMPERATURE':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Heizung "${this.info.customName}" Update Soll-Temperatur JSON: ${JSON.stringify(state)}`,
        );
        this._desiredTemperatur = state.val as number;
        break;
    }
  }
}
