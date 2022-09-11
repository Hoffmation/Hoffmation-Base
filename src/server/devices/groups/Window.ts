import { HmIpGriff } from '../hmIPDevices';
import { LogDebugType, ShutterService, TimeCallbackService, Utils } from '../../services';
import { WindowPosition } from '../models';
import { LogLevel, TimeOfDay, WindowSettings } from '../../../models';
import { iShutter, iVibrationSensor } from '../baseDeviceInterfaces';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { ZigbeeMagnetContact } from '../zigbee';

export class Window extends BaseGroup {
  public desiredPosition: number = 0;
  public settings: WindowSettings = new WindowSettings();

  public constructor(
    roomName: string,
    handleIds: string[] = [],
    vibrationIds: string[] = [],
    shutterIds: string[] = [],
    magnetIds: string[] = [],
    public noRolloOnSunrise: boolean = false,
  ) {
    super(roomName, GroupType.Window);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Handle, new DeviceList(handleIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Vibration, new DeviceList(vibrationIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Shutter, new DeviceList(shutterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.MagnetContact, new DeviceList(magnetIds));
  }

  /**
   * sets the desired Pos and moves rollo to this level
   * @param {number} value
   */
  public setDesiredPosition(value: number): void {
    this.desiredPosition = value;
    this.restoreDesiredPosition();
  }

  public getHandle(): HmIpGriff[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Handle) as HmIpGriff[];
  }

  public getMagnetContact(): ZigbeeMagnetContact[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.MagnetContact) as ZigbeeMagnetContact[];
  }

  public getShutter(): iShutter[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Shutter) as iShutter[];
  }

  public getVibration(): iVibrationSensor[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Vibration) as iVibrationSensor[];
  }

  public griffeInPosition(pPosition: WindowPosition): number {
    let count = 0;
    for (const griff of this.getHandle()) {
      if (griff.position === pPosition) {
        count++;
      }
    }
    return count;
  }

  public initialize(): void {
    this.getHandle().forEach((griff) => {
      griff.addKippCallback((kipp: boolean) => {
        if (!(kipp && this.griffeInPosition(WindowPosition.offen) === 0)) {
          return;
        }
        this.getVibration().forEach((element) => {
          element.vibrationBlockedByGriff = true;
        });
        const timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.getRoom().settings.rolloOffset);
        if (TimeCallbackService.darkOutsideOrNight(timeOfDay)) {
          ShutterService.windowAllMiddle(this);
        } else {
          ShutterService.windowAllUp(this);
        }
      });

      griff.addOffenCallback((offen: boolean) => {
        if (offen) {
          this.getVibration().forEach((element) => {
            element.vibrationBlockedByGriff = true;
          });
          ShutterService.windowAllUp(this);
          return;
        }
      });

      griff.addClosedCallback((geschlossen: boolean) => {
        if (
          geschlossen &&
          this.griffeInPosition(WindowPosition.offen) === 0 &&
          this.griffeInPosition(WindowPosition.kipp) === 0
        ) {
          const now = new Date().getTime();
          this.getVibration().forEach((element) => {
            this.log(LogLevel.Debug, `Starte Timeout für Vibrationsdeaktivierung für ${element.info.customName}`);
            Utils.guardedTimeout(() => {
              if (element.vibrationBlockedByGriffTimeStamp < now) {
                element.vibrationBlockedByGriff = false;
              }
            }, 12000);
          });
          this.restoreDesiredPosition();
        }
      });
    });
    Utils.guardedTimeout(
      () => {
        this.getShutter().forEach((shutter) => {
          shutter.window = this;
        });
        this.getHandle().forEach((g) => {
          g.window = this;
        });
      },
      5,
      this,
    );
  }

  public rolloPositionChange(pValue: number): void {
    this.log(
      LogLevel.Debug,
      `Rollo Position Change in ${this.roomName} to ${pValue}`,
      pValue == this.desiredPosition ? LogDebugType.None : LogDebugType.ShutterPositionChange,
    );

    if (pValue === 0 || pValue === 100) {
      this.getRoom().setLightTimeBased(true);
    }
  }

  public restoreDesiredPosition(): void {
    ShutterService.windowAllToPosition(this, this.desiredPosition, false);
  }
}
