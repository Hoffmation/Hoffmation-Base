import { iProximityCallback } from '../../interfaces';

export class ProximityCallback implements iProximityCallback {
  public constructor(
    readonly deviceName: string,
    readonly distanceTrigger: number,
    readonly callback: (present: boolean, distance: number | undefined) => void,
  ) {}
}
