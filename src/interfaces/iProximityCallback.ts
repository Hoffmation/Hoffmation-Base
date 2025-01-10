export interface iProximityCallback {
  readonly deviceName: string;
  readonly distanceTrigger: number;
  readonly callback: (present: boolean, distance: number | undefined) => void;
}
