import { ZigbeeMagnetContact } from './zigbeeMagnetContact';
import { ServerLogService } from '../../services/log-service';
import { LogLevel } from '../../../models/logLevel';
import { MagnetPosition } from '../models/MagnetPosition';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeSMaBiTMagnetContact extends ZigbeeMagnetContact {
  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.zigbeeSMaBiTMagnetContact);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Magnet Contact Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'opened':
        this.updatePosition((state.val as boolean) ? MagnetPosition.open : MagnetPosition.closed);
        break;
    }
  }
}
