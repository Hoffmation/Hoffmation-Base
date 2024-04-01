import {
  ActuatorSetStateCommand,
  LogLevel,
  MotionSensorAction,
  PresenceGroupFirstEnterAction,
  PresenceGroupLastLeftAction,
  RoomSetLightTimeBasedCommand,
} from '../../../models';
import { RoomService, Utils } from '../../services';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { iMotionSensor } from '../baseDeviceInterfaces';

export class PresenceGroup extends BaseGroup {
  private _lastMovement: Date = new Date(0);
  private _lastLeftTimeout: NodeJS.Timeout | null = null;
  private _lastLeftCbs: ((action: PresenceGroupLastLeftAction) => void)[] = [];
  private _firstEnterCbs: ((action: PresenceGroupFirstEnterAction) => void)[] = [];

  public constructor(roomName: string, motionSensorIds: string[]) {
    super(roomName, GroupType.Presence);
    this.deviceCluster.deviceMap.set(DeviceClusterType.MotionDetection, new DeviceList(motionSensorIds));
  }

  public getMotionDetector(): Array<iMotionSensor> {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.MotionDetection) as Array<iMotionSensor>;
  }

  public initCallbacks(): void {
    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((action) => {
        this.motionSensorOnFirstEnter(action);
        this.motionSensorOnLastLeft(action);
        this.motionSensorAnyMovement(action);
      });
    });

    this.addLastLeftCallback((action: PresenceGroupLastLeftAction) => {
      this.getRoom().WindowGroup?.changeVibrationMotionBlock(false);
      this.getRoom().LightGroup?.switchAll(
        new ActuatorSetStateCommand(action, false, 'Presence Group LastLeftCallback'),
      );
    });

    this.addFirstEnterCallback((action: PresenceGroupFirstEnterAction) => {
      if (!this.getRoom().settings.lampenBeiBewegung) {
        return;
      }
      this.log(LogLevel.DeepTrace, `Bewegung im Raum ${this.roomName} festgestellt --> Licht einschalten`);
      this.getRoom().setLightTimeBased(new RoomSetLightTimeBasedCommand(action, true));
    });
  }

  public addLastLeftCallback(cb: (action: PresenceGroupLastLeftAction) => void): void {
    this._lastLeftCbs.push(cb);
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

  public addFirstEnterCallback(cb: (action: PresenceGroupFirstEnterAction) => void): void {
    this._firstEnterCbs.push(cb);
  }

  private motionSensorAnyMovement(action: MotionSensorAction): void {
    if (!action.motionDetected) {
      return;
    }
    if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !action.sensor.settings.excludeFromNightAlarm)) {
      RoomService.startIntrusionAlarm(this.getRoom(), action.sensor);
    }
    if (!action.sensor.settings.seesWindow) {
      this.getRoom().WindowGroup?.changeVibrationMotionBlock(true);
    }
    RoomService.movementHistory.add(
      `${Utils.nowString()}: Raum "${this.roomName}" Gerät "${action.sensor.info.fullName}"`,
    );
  }

  private motionSensorOnLastLeft(action: MotionSensorAction): void {
    if (action.motionDetected || this.anyPresent()) {
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
      this.executeLastLeftCbs(new PresenceGroupLastLeftAction(action));
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
          `Delayed Movement reset. Active Motions: ${this.presentAmount()}\tTime after Last Movement including Reset: ${timeAfterReset}, action: ${action.reasonTrace}`,
        );
        if (presentAmount <= 0 && timeAfterReset > 0) {
          this.executeLastLeftCbs(new PresenceGroupLastLeftAction(action));
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

  private motionSensorOnFirstEnter(action: MotionSensorAction): void {
    if (!action.motionDetected) {
      return;
    }
    this._lastMovement = new Date();
    if (this.presentAmount() > 1) {
      return;
    }

    for (const cb of this._firstEnterCbs) {
      cb(new PresenceGroupFirstEnterAction(action));
    }
  }

  private executeLastLeftCbs(action: PresenceGroupLastLeftAction): void {
    for (const cb of this._lastLeftCbs) {
      cb(action);
    }
  }
}
