import { RoomBase } from '../RoomBase';
import { ServerLogService } from '../../../server/services/log-service';
import { LogLevel } from '../../logLevel';

export class RoomAddDeviceItem {
  private _added: boolean = false;

  public get added(): boolean {
    return this._added;
  }

  public set added(value: boolean) {
    if (this._added) {
      ServerLogService.writeLog(LogLevel.Error, `${this.customName} Added twice`);
    }
    this._added = value;
  }

  constructor(public setID: (value: string) => RoomBase, public index: number, public customName: string) {}
}
