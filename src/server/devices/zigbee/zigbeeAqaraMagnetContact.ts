import { ZigbeeMagnetContact } from './BaseDevices/index.js';
import { LogLevel } from '../../../models/index.js';
import { MagnetPosition } from '../models/index.js';
import { DeviceType } from '../deviceType.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';

export class ZigbeeAqaraMagnetContact extends ZigbeeMagnetContact {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAqaraMagnetContact);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Magnet Contact Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'opened':
        this.updatePosition((state.val as boolean) ? MagnetPosition.open : MagnetPosition.closed);
        break;
    }
  }
}
