import { Utils } from '../../services';
import { iBluetoothDetector } from '../baseDeviceInterfaces/iBluetoothDetector';

export class TrackedDistanceData {
  public trackerName: string;
  public distance: number | undefined;
  public lastUpdate: number = 0;
  public previousDistance: number | undefined;

  public constructor(tracker: iBluetoothDetector) {
    this.trackerName = tracker.info.customName;
  }

  public update(distance: number): void {
    this.previousDistance = this.distance;
    this.distance = distance;
    this.lastUpdate = Utils.nowMS();
  }

  public isOutdated(maxAge: number = 120): boolean {
    return this.lastUpdate < Utils.nowMS() - maxAge * 1000;
  }
}
