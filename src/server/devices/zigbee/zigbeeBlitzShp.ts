import { LogLevel } from '../../../models/logLevel';
import { ServerLogService } from '../../services/log-service';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { DeviceType } from '../deviceType';
import { ActuatorSettings } from '../../../models/actuatorSettings';

export class ZigbeeBlitzShp extends ZigbeeDevice {
  public steckerOn: boolean = false;
  public current: number = 0;
  public energy: number = 0;
  public loadPower: number = 0;
  public settings: ActuatorSettings = new ActuatorSettings();
  private steckerOnSwitchID: string = '';

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeBlitzShp);
    this.steckerOnSwitchID = `${this.info.fullID}.state`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Stecker Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        ServerLogService.writeLog(LogLevel.Trace, `Stecker Update für ${this.info.customName} auf ${state.val}`);
        this.steckerOn = state.val as boolean;
        break;
      case 'energy':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Stecker Update für ${this.info.customName} auf Energie: ${state.val}`,
        );
        this.energy = state.val as number;
        break;
      case 'current':
        ServerLogService.writeLog(LogLevel.Trace, `Stecker Update für ${this.info.customName} auf Strom: ${state.val}`);
        this.current = state.val as number;
        break;
      case 'load_power':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Stecker Update für ${this.info.customName} auf Leistungsaufnahme: ${state.val}`,
        );
        this.loadPower = state.val as number;
        break;
    }
  }

  public setStecker(pValue: boolean): void {
    if (this.steckerOnSwitchID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine Switch ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    ServerLogService.writeLog(LogLevel.Debug, `Stecker schalten: "${this.info.customName}" Wert: ${pValue}`);
    this.ioConn.setState(this.steckerOnSwitchID, pValue, (err) => {
      if (err) {
        console.log(`Stecker schalten ergab Fehler: ${err}`);
      }
    });
  }

  public toggleStecker(): boolean {
    const newVal = !this.steckerOn;
    this.setStecker(newVal);
    return newVal;
  }
}
