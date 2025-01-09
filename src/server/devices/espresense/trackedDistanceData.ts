import { Utils } from '../../services/index.js';
import { iBluetoothDetector } from '../baseDeviceInterfaces/iBluetoothDetector.js';

export class TrackedDistanceData {
  /**
   * The name of the tracker who detected this device
   */
  public trackerName: string;
  /**
   * The distance to the tracker
   */
  public distance: number | undefined;
  /**
   * The time of the last update
   */
  public lastUpdate: number = 0;
  /**
   * The distance to the tracker before the last update (if available) can be used to calculate certain movements
   */
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
