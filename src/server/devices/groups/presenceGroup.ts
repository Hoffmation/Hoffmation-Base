import { ActuatorSetStateCommand, CommandSource, LogLevel, RoomSetLightTimeBasedCommand } from '../../../models';
import { RoomService, Utils } from '../../services';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { iMotionSensor } from '../baseDeviceInterfaces';

export class PresenceGroup extends BaseGroup {
  private _lastMovement: Date = new Date(0);
  private _lastLeftTimeout: NodeJS.Timeout | null = null;
  private _lastLeftCbs: (() => void)[] = [];
  private _firstEnterCbs: (() => void)[] = [];

  public constructor(roomName: string, motionSensorIds: string[]) {
    super(roomName, GroupType.Presence);
    this.deviceCluster.deviceMap.set(DeviceClusterType.MotionDetection, new DeviceList(motionSensorIds));
  }

  public getMotionDetector(): Array<iMotionSensor> {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.MotionDetection) as Array<iMotionSensor>;
  }

  public initCallbacks(): void {
    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((val) => {
        if (!val) {
          return;
        }
        if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !b.settings.excludeFromNightAlarm)) {
          RoomService.startIntrusionAlarm(this.getRoom(), b);
        }
        if (!b.settings.seesWindow) {
          this.getRoom().WindowGroup?.changeVibrationMotionBlock(true);
        }
        RoomService.movementHistory.add(`${Utils.nowString()}: Raum "${this.roomName}" Gerät "${b.info.fullName}"`);
      });
    });

    this.addLastLeftCallback(() => {
      this.getRoom().WindowGroup?.changeVibrationMotionBlock(false);
      this.getRoom().LightGroup?.switchAll(
        new ActuatorSetStateCommand(CommandSource.Automatic, false, 'Presence Group LastLeftCallback'),
      );
    });

    this.addFirstEnterCallback(() => {
      if (!this.getRoom().settings.lampenBeiBewegung) {
        return;
      }
      this.log(LogLevel.DeepTrace, `Bewegung im Raum ${this.roomName} festgestellt --> Licht einschalten`);
      this.getRoom().setLightTimeBased(
        new RoomSetLightTimeBasedCommand(CommandSource.Automatic, true, 'Motion detected'),
      );
    });

    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((val) => {
        this.motionSensorOnFirstEnter(val);
      });
    });

    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((val) => {
        this.motionSensorOnLastLeft(val);
      });
    });
  }

  public presentAmount(): number {
    let count = 0;
    for (let i = 0; i < this.getMotionDetector().length; i++) {
      if (this.getMotionDetector()[i].movementDetected) {
        count++;
      }
    }

    return count;
  }

  public anyPresent(): boolean {
    for (let i = 0; i < this.getMotionDetector().length; i++) {
      if (this.getMotionDetector()[i].movementDetected) {
        return true;
      }
    }

    return false;
  }

  public addLastLeftCallback(cb: () => void): void {
    this._lastLeftCbs.push(cb);
  }

  public addFirstEnterCallback(cb: () => void): void {
    this._firstEnterCbs.push(cb);
  }

  private motionSensorOnLastLeft(val: boolean): void {
    if (val || this.anyPresent()) {
      this.resetLastLeftTimeout();
      return;
    }

    let timeAfterReset: number =
      Utils.nowMS() - this._lastMovement.getTime() - this.getRoom().settings.movementResetTimer * 1000;
    if (timeAfterReset > 0) {
      this.log(
        LogLevel.Debug,
        `Movement reset. Active Motions: ${this.presentAmount()}\tTime after Last Movement including Reset: ${timeAfterReset}`,
      );
      this.executeLastLeftCbs();
      return;
    }
    this.log(LogLevel.Debug, `Movement reset in ${this.roomName} delayed.`);
    this.resetLastLeftTimeout();
    this._lastLeftTimeout = Utils.guardedTimeout(
      () => {
        timeAfterReset =
          Utils.nowMS() - this._lastMovement.getTime() - this.getRoom().settings.movementResetTimer * 1000;
        const presentAmount: number = this.presentAmount();
        this.log(
          LogLevel.Debug,
          `Delayed Movement reset. Active Motions: ${this.presentAmount()}\tTime after Last Movement including Reset: ${timeAfterReset}`,
        );
        if (presentAmount <= 0 && timeAfterReset > 0) {
          this.executeLastLeftCbs();
        }
      },
      Math.abs(timeAfterReset) + 500,
      this,
    );
  }

  /**
   * In case of an existing delayed last left callback timeout, this removes it.
   */
  private resetLastLeftTimeout() {
    if (this._lastLeftTimeout !== null) {
      clearTimeout(this._lastLeftTimeout);
    }
  }

  private motionSensorOnFirstEnter(val: boolean): void {
    if (!val) {
      return;
    }
    this._lastMovement = new Date();
    if (this.presentAmount() > 1) {
      return;
    }

    for (const cb of this._firstEnterCbs) {
      cb();
    }
  }

  private executeLastLeftCbs(): void {
    for (const cb of this._lastLeftCbs) {
      cb();
    }
  }
}
