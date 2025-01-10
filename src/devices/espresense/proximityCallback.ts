export class ProximityCallback {
  public constructor(
    public readonly deviceName: string,
    public readonly distanceTrigger: number,
    public readonly callback: (present: boolean, distance: number | undefined) => void,
  ) {}
}
