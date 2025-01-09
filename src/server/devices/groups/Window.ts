import { LogDebugType, ShutterService, TimeCallbackService, Utils } from '../../services/index.js';
import { WindowPosition } from '../models/index.js';
import {
  CommandSource,
  HandleChangeAction,
  LogLevel,
  RoomSetLightTimeBasedCommand,
  ShutterPositionChangedAction,
  ShutterSetLevelCommand,
  TimeOfDay,
  WindowRestoreDesiredPositionCommand,
  WindowSetDesiredPositionCommand,
} from '../../../models/index.js';
import { iHandleSensor, iShutter, iVibrationSensor } from '../baseDeviceInterfaces/index.js';
import { BaseGroup } from './base-group.js';
import { GroupType } from './group-type.js';
import { DeviceClusterType } from '../device-cluster-type.js';
import { DeviceList } from '../device-list.js';
import { ZigbeeMagnetContact } from '../zigbee/index.js';

export class Window extends BaseGroup {
  private _desiredPosition: number = 0;

  /**
   * The desired shutter level for the window
   * @returns {number} The level (0 closed, 100 open)
   */
  public get desiredPosition(): number {
    return this._desiredPosition;
  }

  /**
   * Checks if any shutter is down (0%)
   * @returns {boolean} true if any shutter is down
   */
  public get anyShutterDown(): boolean {
    return this.getShutter().some((s: iShutter) => {
      return s.currentLevel === 0;
    });
  }

  /**
   * Checks if any handle is not closed
   * @returns {boolean} true if any handle is not closed
   */
  public get anyHandleNotClosed(): boolean {
    return this.getHandle().some((h: iHandleSensor) => {
      return h.position !== WindowPosition.closed;
    });
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

  public getHandle(): iHandleSensor[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Handle) as iHandleSensor[];
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
        if (!(kipp && this.griffeInPosition(WindowPosition.open) === 0)) {
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
          this.griffeInPosition(WindowPosition.open) === 0 &&
          this.griffeInPosition(WindowPosition.tilted) === 0
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

  public rolloPositionChange(action: ShutterPositionChangedAction): void {
    this.log(
      LogLevel.Debug,
      `Rollo Position Change in ${this.roomName}: ${action.reasonTrace}`,
      action.newPosition == this._desiredPosition ? LogDebugType.None : LogDebugType.ShutterPositionChange,
    );

    if (action.newPosition === 0 || action.newPosition === 100) {
      this.getRoom().setLightTimeBased(new RoomSetLightTimeBasedCommand(action, true));
    }
  }

  public restoreDesiredPosition(c: WindowRestoreDesiredPositionCommand): void {
    ShutterService.windowAllToPosition(this, new ShutterSetLevelCommand(c, this._desiredPosition));
  }

  public addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void {
    this.getHandle().forEach((griff: iHandleSensor): void => {
      griff.addHandleChangeCallback(cb);
    });
  }
}
