import { DeviceType } from '../deviceType';
import { LogLevel } from '../../logging';
import { iIlluminationSensor } from '../baseDeviceInterfaces';
import { ZigbeeMotionSensor } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { Utils } from '../../utils/utils';

export class ZigbeeAquaraMotion extends ZigbeeMotionSensor implements iIlluminationSensor {
  private _illuminance: number = 0;
  private occupancyTimeoutID = 'occupancy_timeout';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraMotion);
    this.deviceCapabilities.push(DeviceCapability.illuminationSensor);

    this.occupancyTimeoutID = `${this.info.fullID}.${this.occupancyTimeoutID}`;
  }

  private _motionTimeout: number = 0;

  /**
   * Time after the last trigger until a motion event gets triggered again
   * @returns The time in ??? unit TODO: RF
   */
  public get motionTimeout(): number {
    return this._motionTimeout;
  }

  public set motionTimeout(value: number) {
    this.setState(
      this.occupancyTimeoutID,
      value,
      () => {
        this._motionTimeout = value;
      },
      (err) => {
        console.log(`Error occurred while setting motion timeout: ${err}`);
      },
    );
  }

  /** @inheritDoc */
  public get currentIllumination(): number {
    return this._illuminance;
  }

  private set currentIllumination(value: number) {
    this._illuminance = value;
    Utils.dbo?.persistIlluminationSensor(this);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Motion update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'illuminance':
        this.log(LogLevel.Trace, `Motion sensor: Update for illuminance of ${this.info.customName}: ${state.val}`);
        this.currentIllumination = state.val as number;
        break;
      case 'occupancy_timeout':
        this.log(LogLevel.Trace, `Motion sensor: Update for motion timeout of ${this.info.customName}: ${state.val}`);
        this._motionTimeout = state.val as number;
        break;
    }
  }
}
