import { ZigbeeMagnetContact } from './BaseDevices';
import { LogLevel } from '../../logging';
import { MagnetPosition } from '../models';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

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
