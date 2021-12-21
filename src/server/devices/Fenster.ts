import { HmIpGriff } from './hmIPDevices/hmIpGriff';
import { ServerLogService } from '../services/log-service';
import { Utils } from '../services/utils/utils';
import { ZigbeeAquaraVibra } from './zigbee/zigbeeAquaraVibra';
import { FensterPosition } from './models/FensterPosition';
import { TimeCallbackService, TimeOfDay } from '../services/time-callback-service';
import { LogLevel } from '../../models/logLevel';
import { iShutter } from './iShutter';
import { ShutterService } from '../services/ShutterService';
import { BaseGroup } from './groups/base-group';
import { GroupType } from './groups/group-type';
import { DeviceClusterType } from './device-cluster-type';
import { DeviceList } from './device-list';

export class Fenster extends BaseGroup {
  public desiredPosition: number = 0;

  /**
   * sets the desired Pos and moves rollo to this level
   * @param {number} value
   */
  public setDesiredPosition(value: number): void {
    this.desiredPosition = value;
    this.restoreDesiredPosition();
  }

  public constructor(
    roomName: string,
    handleIds: string[] = [],
    vibrationIds: string[] = [],
    shutterIds: string[] = [],
    public noRolloOnSunrise: boolean = false,
  ) {
    super(roomName, GroupType.Window);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Handle, new DeviceList(handleIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Vibration, new DeviceList(vibrationIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Shutter, new DeviceList(shutterIds));
    for (const griff of this.getHandle()) {
      griff.addKippCallback((kipp: boolean) => {
        if (!(kipp && this.griffeInPosition(FensterPosition.offen) === 0)) {
          return;
        }
        this.getVibration().forEach((element) => {
          element.vibrationBlocked = true;
        });
        const timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.getRoom().Einstellungen.rolloOffset);
        this.getShutter().forEach((shutter) => {
          if (TimeCallbackService.darkOutsideOrNight(timeOfDay)) {
            shutter.setLevel(50, false);
          } else {
            ShutterService.up(shutter);
          }
        });
      });

      griff.addOffenCallback((offen: boolean) => {
        if (offen) {
          this.getVibration().forEach((element) => {
            element.vibrationBlocked = true;
          });
          this.getShutter().forEach((shutter) => {
            ShutterService.up(shutter);
          });
          return;
        }
      });

      griff.addClosedCallback((geschlossen: boolean) => {
        if (
          geschlossen &&
          this.griffeInPosition(FensterPosition.offen) === 0 &&
          this.griffeInPosition(FensterPosition.kipp) === 0
        ) {
          const now = new Date().getTime();
          this.getVibration().forEach((element) => {
            ServerLogService.writeLog(
              LogLevel.Debug,
              `Starte Timeout für Vibrationsdeaktivierung für ${element.info.customName}`,
            );
            Utils.guardedTimeout(() => {
              if (element.vibrationBlockedTimeStamp < now) {
                element.vibrationBlocked = false;
              }
            }, 12000);
          });
          this.restoreDesiredPosition();
        }
      });
    }
    Utils.guardedTimeout(
      () => {
        this.getShutter().forEach((shutter) => {
          shutter.fenster = this;
        });
        for (const g of this.getHandle()) {
          g.Fenster = this;
        }
      },
      5,
      this,
    );
  }

  public getHandle(): HmIpGriff[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Handle) as HmIpGriff[];
  }

  public getShutter(): iShutter[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Shutter) as iShutter[];
  }

  public getVibration(): ZigbeeAquaraVibra[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Vibration) as ZigbeeAquaraVibra[];
  }

  public griffeInPosition(pPosition: FensterPosition): number {
    let count = 0;
    for (const griff of this.getHandle()) {
      if (griff.position === pPosition) {
        count++;
      }
    }
    return count;
  }

  public rolloPositionChange(pValue: number): void {
    ServerLogService.writeLog(LogLevel.Debug, `Rollo Position Change in ${this.roomName} to ${pValue}`);

    if (pValue === 0 || pValue === 100) {
      this.getRoom().setLightTimeBased(true);
    }
  }

  public restoreDesiredPosition(): void {
    this.getShutter().forEach((shutter) => {
      shutter.setLevel(this.desiredPosition, false);
    });
  }
}
