export class DeviceList {
  public get ids(): string[] {
    return this._ids;
  }
  public constructor(private _ids: string[] = []) {}
}
