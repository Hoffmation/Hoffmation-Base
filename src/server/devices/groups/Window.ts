import { HmIpGriff } from '../hmIPDevices';
import { LogDebugType, ShutterService, TimeCallbackService, Utils } from '../../services';
import { WindowPosition } from '../models';
import {
  CommandSource,
  LogLevel,
  RoomSetLightTimeBasedCommand,
  ShutterSetLevelCommand,
  TimeOfDay,
  WindowRestoreDesiredPositionCommand,
  WindowSetDesiredPositionCommand,
} from '../../../models';
import { iShutter, iVibrationSensor } from '../baseDeviceInterfaces';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { ZigbeeMagnetContact } from '../zigbee';

export class Window extends BaseGroup {
  private _desiredPosition: number = 0;

  /**
   * The desired shutter level for the window
   * @returns {number} The level (0 closed, 100 open)
   */
  public get desiredPosition(): number {
    return this._desiredPosition;
  }

  public constructor(
    roomName: string,
    public readonly handleIds: string[] = [],
    public readonly vibrationIds: string[] = [],
    public readonly shutterIds: string[] = [],
    public readonly magnetIds: string[] = [],
  ) {
    super(roomName, GroupType.Window);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Handle, new DeviceList(handleIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Vibration, new DeviceList(vibrationIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Shutter, new DeviceList(shutterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.MagnetContact, new DeviceList(magnetIds));
  }

  /**
   * sets the desired Pos and moves rollo to this level
   * @param c - The command to execute
   */
  public setDesiredPosition(c: WindowSetDesiredPositionCommand): void {
    this._desiredPosition = c.position;
    this.restoreDesiredPosition(new WindowRestoreDesiredPositionCommand(c));
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
          element.vibrationBlockedByHandle = true;
        });
        const timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.getRoom().settings.rolloOffset);
        ShutterService.windowAllToPosition(
          this,
          new ShutterSetLevelCommand(
            CommandSource.Automatic,
            TimeCallbackService.darkOutsideOrNight(timeOfDay) ? 50 : 100,
            'Window ajar by handle',
          ),
        );
      });

      griff.addOffenCallback((offen: boolean) => {
        if (offen) {
          this.getVibration().forEach((element) => {
            element.vibrationBlockedByHandle = true;
          });
          ShutterService.windowAllToPosition(
            this,
            new ShutterSetLevelCommand(CommandSource.Automatic, 100, 'Window opened by handle'),
          );
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
              if (element.vibrationBlockedByHandleTimeStamp < now) {
                element.vibrationBlockedByHandle = false;
              }
            }, 12000);
          });
          this.restoreDesiredPosition(
            new WindowRestoreDesiredPositionCommand(CommandSource.Automatic, 'Last window Handle closed'),
          );
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
      pValue == this._desiredPosition ? LogDebugType.None : LogDebugType.ShutterPositionChange,
    );

    if (pValue === 0 || pValue === 100) {
      this.getRoom().setLightTimeBased(
        new RoomSetLightTimeBasedCommand(CommandSource.Automatic, true, 'Window.rolloPositionChange'),
      );
    }
  }

  public restoreDesiredPosition(c: WindowRestoreDesiredPositionCommand): void {
    ShutterService.windowAllToPosition(this, new ShutterSetLevelCommand(c, this._desiredPosition));
  }
}
