import {
  MotionSensorAction,
  PresenceGroupAnyMovementAction,
  PresenceGroupFirstEnterAction,
  PresenceGroupLastLeftAction,
} from '../../action';
import { BaseGroup } from './base-group';
import { DeviceClusterType, GroupType, LogDebugType, LogLevel } from '../../enums';
import { DeviceList } from '../device-list';
import { iMotionSensor, iPresenceGroup } from '../../interfaces';
import { ActuatorSetStateCommand, RoomSetLightTimeBasedCommand } from '../../command';
import { RoomService } from '../../services';
import { Utils } from '../../utils';

export class PresenceGroup extends BaseGroup implements iPresenceGroup {
  private _lastMovement: Date = new Date(0);
  private _lastLeftTimeout: NodeJS.Timeout | null = null;
  private _lastLeftCbs: ((action: PresenceGroupLastLeftAction) => void)[] = [];
  private _firstEnterCbs: ((action: PresenceGroupFirstEnterAction) => void)[] = [];
  private _anyMovementCbs: ((action: PresenceGroupAnyMovementAction) => void)[] = [];

  public constructor(roomName: string, motionSensorIds: string[]) {
    super(roomName, GroupType.Presence);
    this.deviceCluster.deviceMap.set(DeviceClusterType.MotionDetection, new DeviceList(motionSensorIds));
  }

  public get lastLeftDelayActive(): boolean {
    return this.getTimeAfterReset() < 0;
  }

  public getMotionDetector(): Array<iMotionSensor> {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.MotionDetection) as Array<iMotionSensor>;
  }

  public initCallbacks(): void {
    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((action) => {
        if (!action.motionDetected && !this.anyPresent()) {
          this.motionSensorOnLastLeft(action);
          return;
        }
        if (!action.motionDetected && this.anyPresent()) {
          this.resetLastLeftTimeout();
          return;
        }

        // At this Point we can be certain about motion being detected.
        this.log(
          LogLevel.Debug,
          `New Motion detected, present Amount: ${this.presentAmount()}`,
          LogDebugType.NewMovementState,
        );
        this.motionSensorOnAnyMovement(action);
        if (this.presentAmount() === 1 && this._lastLeftTimeout === null) {
          this.fireFistEnterCBs(action);
        }
        this.resetLastLeftTimeout();
      });
    });

    this.addLastLeftCallback((action: PresenceGroupLastLeftAction) => {
      this.getRoom().WindowGroup?.changeVibrationMotionBlock(false);
      this.getRoom().LightGroup?.switchAll(
        new ActuatorSetStateCommand(action, false, 'Presence Group LastLeftCallback'),
      );
    });

    this.addAnyMovementCallback((action: PresenceGroupAnyMovementAction) => {
      if (!this.getRoom().settings.lampenBeiBewegung) {
        return;
      }
      this.log(LogLevel.DeepTrace, `Bewegung im Raum ${this.roomName} festgestellt --> Licht einschalten`);
      this.getRoom().setLightTimeBased(new RoomSetLightTimeBasedCommand(action, true));
    });
  }

  public anyPresent(includeMovementResetDelayCheck: boolean = false): boolean {
    if (includeMovementResetDelayCheck && this.lastLeftDelayActive) {
      return true;
    }
    return this.presentAmount() > 0;
  }

  public addLastLeftCallback(cb: (action: PresenceGroupLastLeftAction) => void): void {
    this._lastLeftCbs.push(cb);
  }

  public addAnyMovementCallback(cb: (action: PresenceGroupAnyMovementAction) => void): void {
    this._anyMovementCbs.push(cb);
  }

  public presentAmount(): number {
    return this.getMotionDetector().filter((b) => b.movementDetected).length;
  }

  public fireFistEnterCBs(action: MotionSensorAction): void {
    for (const cb of this._firstEnterCbs) {
      cb(new PresenceGroupFirstEnterAction(action));
    }
  }

  public addFirstEnterCallback(cb: (action: PresenceGroupFirstEnterAction) => void): void {
    this._firstEnterCbs.push(cb);
  }

  public motionSensorOnAnyMovement(action: MotionSensorAction): void {
    this._lastMovement = new Date();
    if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !action.sensor.settings.excludeFromNightAlarm)) {
      RoomService.startIntrusionAlarm(this.getRoom(), action.sensor);
    }
    if (!action.sensor.settings.seesWindow) {
      this.getRoom().WindowGroup?.changeVibrationMotionBlock(true);
    }
    RoomService.movementHistory.add(
      `${Utils.nowString()}: Raum "${this.roomName}" Gerät "${action.sensor.info.fullName}"`,
    );
    this.executeAnyMovementCbs(new PresenceGroupAnyMovementAction(action));
  }

  public motionSensorOnLastLeft(action: MotionSensorAction): void {
    let timeAfterReset: number = this.getTimeAfterReset();
    if (timeAfterReset > 0) {
      this._lastLeftTimeout = null;
      this.log(
        LogLevel.Debug,
        `Movement reset. Active Motions: ${this.presentAmount()}\tTime after Last Movement including Reset: ${timeAfterReset}`,
      );
      this.executeLastLeftCbs(new PresenceGroupLastLeftAction(action));
      return;
    }
    const newResetTime: Date = new Date(Utils.nowMS() + Math.abs(timeAfterReset));
    this.log(
      LogLevel.Debug,
      `Movement reset in ${this.roomName} delayed to ${newResetTime.toLocaleTimeString('de-DE')}.`,
    );
    this.resetLastLeftTimeout();
    this._lastLeftTimeout = Utils.guardedTimeout(
      () => {
        this._lastLeftTimeout = null;
        timeAfterReset = this.getTimeAfterReset();
        const presentAmount: number = this.presentAmount();
        this.log(
          LogLevel.Debug,
          `Delayed Movement reset. Active Motions: ${presentAmount}\tTime after Last Movement including Reset: ${timeAfterReset}, action: ${action.reasonTrace}`,
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
   * Calculates whether we are after (negative if before) the time the movement
   * reset timer should have reset the movement.
   * @returns The time in milliseconds after the reset time.
   */
  public getTimeAfterReset(): number {
    return Utils.nowMS() - this._lastMovement.getTime() - this.getRoom().settings.movementResetTimer * 1000;
  }

  /**
   * In case of an existing delayed last left callback timeout, this removes it.
   */
  public resetLastLeftTimeout() {
    if (this._lastLeftTimeout === null) {
      return;
    }
    clearTimeout(this._lastLeftTimeout);
    this._lastLeftTimeout = null;
  }

  public executeAnyMovementCbs(action: PresenceGroupAnyMovementAction): void {
    for (const cb of this._anyMovementCbs) {
      cb(action);
    }
  }

  public executeLastLeftCbs(action: PresenceGroupLastLeftAction): void {
    for (const cb of this._lastLeftCbs) {
      cb(action);
    }
  }
}
