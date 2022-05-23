import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { CurrentIlluminationDataPoint, LogLevel } from '../../../models';
import { iIlluminationSensor } from '../baseDeviceInterfaces';
import { ZigbeeMotionSensor } from './zigbeeMotionSensor';
import { Utils } from '../../services';

export class ZigbeeAquaraMotion extends ZigbeeMotionSensor implements iIlluminationSensor {
  private _illuminance: number = 0;
  private occupancyTimeoutID = `occupancy_timeout`;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraMotion);

    this.occupancyTimeoutID = `${this.info.fullID}.${this.occupancyTimeoutID}`;
  }

  private _motionTimeout: number = 0;

  // Time after the last trigger until a motion event gets triggered again
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

  // Currently measured brightness in lux
  public get currentIllumination(): number {
    return this._illuminance;
  }

  private set currentIllumination(value: number) {
    this._illuminance = value;
    Utils.dbo?.persistCurrentIllumination(
      new CurrentIlluminationDataPoint(
        this.info.room,
        this.info.devID,
        value,
        new Date(),
        this.room?.LampenGroup?.anyLightsOwn() ?? false,
      ),
    );
  }

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
