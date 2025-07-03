import { iHandle, iShutter, iVibrationSensor, iWindow } from '../../interfaces';
import { HandleChangeAction, ShutterPositionChangedAction } from '../../action';
import {
  CommandSource,
  DeviceClusterType,
  GroupType,
  LogDebugType,
  LogLevel,
  TimeOfDay,
  WindowPosition,
} from '../../enums';
import { DeviceList } from '../device-list';
import { ZigbeeMagnetContact } from '../zigbee';
import { TimeCallbackService } from '../../services';
import { Utils } from '../../utils';
import {
  BlockAutomaticLiftBlockCommand,
  RoomSetLightTimeBasedCommand,
  ShutterSetLevelCommand,
  WindowRestoreDesiredPositionCommand,
  WindowSetDesiredPositionCommand,
} from '../../command';
import { BaseGroup } from './base-group';

export class Window extends BaseGroup implements iWindow {
  /**
   * The desired shutter level for the window
   * @returns {number} The level (0 closed, 100 open)
   */
  public get desiredPosition(): number {
    return this.getShutter().baseAutomaticLevel;
  }

  /**
   * Checks if any shutter is down (0%)
   * @returns {boolean} true if any shutter is down
   */
  public get anyShutterDown(): boolean {
    return this.getShutter().currentLevel === 0;
  }

  public constructor(
    roomName: string,
    readonly handleIds: string[] = [],
    readonly vibrationIds: string[] = [],
    readonly shutterIds: string[] = [],
    readonly magnetIds: string[] = [],
  ) {
    super(roomName, GroupType.Window);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Handle, new DeviceList(handleIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Vibration, new DeviceList(vibrationIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Shutter, new DeviceList(shutterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.MagnetContact, new DeviceList(magnetIds));
  }

  /**
   * Checks if any handle is not closed
   * @returns {boolean} true if any handle is not closed
   */
  public get anyHandleNotClosed(): boolean {
    return this.getHandle().some((h: iHandle) => {
      return h.position !== WindowPosition.closed;
    });
  }

  /**
   * sets the desired Pos and moves rollo to this level
   * @param c - The command to execute
   */
  public setDesiredPosition(c: WindowSetDesiredPositionCommand): void {
    const shutter: iShutter | undefined = this.getShutter();
    if (!shutter) {
      return;
    }
    shutter.setLevel(new ShutterSetLevelCommand(c, c.position));
  }

  public getHandle(): iHandle[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Handle) as iHandle[];
  }

  public getMagnetContact(): ZigbeeMagnetContact[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.MagnetContact) as ZigbeeMagnetContact[];
  }

  public getShutter(): iShutter {
    return (this.deviceCluster.getDevicesByType(DeviceClusterType.Shutter) as iShutter[])[0];
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
        this.getShutter()?.setLevel(
          new ShutterSetLevelCommand(
            CommandSource.Force,
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
          this.getShutter().setLevel(new ShutterSetLevelCommand(CommandSource.Force, 100, 'Window opened by handle'));
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
        const shutter = this.getShutter();
        if (shutter) {
          shutter.window = this;
        }
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
      action.newPosition == this.desiredPosition ? LogDebugType.None : LogDebugType.ShutterPositionChange,
    );

    if (action.newPosition === 0 || action.newPosition === 100) {
      this.getRoom().setLightTimeBased(new RoomSetLightTimeBasedCommand(action, true));
    }
  }

  public restoreDesiredPosition(c: WindowRestoreDesiredPositionCommand): void {
    this.getShutter()?.blockAutomationHandler.liftAutomaticBlock(
      new BlockAutomaticLiftBlockCommand(c, 'Window restore desired position', true),
    );
  }

  public addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void {
    this.getHandle().forEach((griff: iHandle): void => {
      griff.addHandleChangeCallback(cb);
    });
  }
}
