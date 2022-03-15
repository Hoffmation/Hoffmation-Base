import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { LogLevel } from '../../../models/logLevel';
import { iIlluminationSensor } from '../iIlluminationSensor';
import { ZigbeeMotionSensor } from './zigbeeMotionSensor';
import { dbo } from '../../../index';

export class ZigbeeAquaraMotion extends ZigbeeMotionSensor implements iIlluminationSensor {
  private _illuminance: number = 0;
  private _motionTimeout: number = 0;
  private occupancyTimeoutID = `occupancy_timeout`;

  // Currently measured brightness in lux
  public get currentIllumination(): number {
    return this._illuminance;
  }

  private set currentIllumination(value: number) {
    this._illuminance = value;
    dbo?.persistCurrentIllumination(
      new CurrentIlluminationDataPoint(
        this.info.room,
        this.info.devID,
        value,
        new Date(),
        this.room?.LampenGroup?.anyLightsOwn() ?? false,
      ),
    );
  }

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

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraMotion);

    this.occupancyTimeoutID = `${this.info.fullID}.${this.occupancyTimeoutID}`;
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
