export class DeviceInfo {
  public fullName: string = '';
  public room: string = '';
  public allDevicesKey?: string;
  private _customName?: string;

  public get customName(): string {
    if (this._customName !== undefined) {
      return this._customName;
    }

    return this.fullName;
  }

  public set customName(val: string) {
    this._customName = val;
  }

  public toJSON(): Partial<DeviceInfo> {
    return this;
  }
}
