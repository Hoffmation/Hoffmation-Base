import { DeviceType } from '../deviceType';
import { ActuatorSettings } from '../../../models/actuatorSettings';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';

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
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        const newSteckerOn: boolean = state.val as boolean;
        this.log(
          newSteckerOn !== this.steckerOn ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet Update to ${state.val}`,
        );
        this.steckerOn = newSteckerOn;
        break;
      case 'energy':
        const newEnergy: number = state.val as number;
        this.log(
          newEnergy !== this.energy ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new total consumption: ${state.val}`,
        );
        this.energy = newEnergy;
        break;
      case 'current':
        const newCurrent: number = state.val as number;
        this.log(
          Math.abs(newCurrent - this.current) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current: ${state.val}`,
        );
        this.current = newCurrent;
        break;
      case 'load_power':
        const newLoadPower: number = state.val as number;
        this.log(
          Math.abs(newLoadPower - this.loadPower) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current load power: ${state.val}`,
        );
        this.loadPower = newLoadPower;
        break;
    }
  }

  public setStecker(pValue: boolean): void {
    if (this.steckerOnSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    this.log(LogLevel.Debug, `Switch outlet, target Value: ${pValue}`);
    this.setState(this.steckerOnSwitchID, pValue, undefined, (err) => {
      this.log(LogLevel.Error, `Switching outlet resulted in error: ${err}`);
    });
  }

  public toggleStecker(): boolean {
    const newVal = !this.steckerOn;
    this.setStecker(newVal);
    return newVal;
  }
}
