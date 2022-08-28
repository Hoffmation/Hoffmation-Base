export class DetectedBluetoothDevice {
  public distance: number | undefined;
  public lastUpdate: number = 0;
  public previousDistance: number | undefined;

  constructor(public id: string, public name: string) {}
}
