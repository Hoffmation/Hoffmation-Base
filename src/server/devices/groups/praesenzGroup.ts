import { TimeCallback, TimeCallbackType } from '../../../models/timeCallback';
import { HmIpPraezenz } from '../hmIPDevices/hmIpPraezenz';
import { Utils } from '../../services/utils/utils';
import { LogLevel } from '../../../models/logLevel';
import { TimeCallbackService } from '../../services/time-callback-service';
import { HmIpBewegung } from '../hmIPDevices/hmIpBewegung';
import { RoomService } from '../../services/room-service/room-service';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { ZigbeeMotionSensor } from '../zigbee/zigbeeMotionSensor';

export class PraesenzGroup extends BaseGroup {
  private _lastMovement: Date = new Date(0);

  public getMotionDetector(): Array<HmIpBewegung | ZigbeeMotionSensor> {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.MotionDetection) as Array<
      HmIpBewegung | ZigbeeMotionSensor
    >;
  }

  public getPresenceSensors(): HmIpPraezenz[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.PresenceDetection) as HmIpPraezenz[];
  }

  public constructor(roomName: string, presenceDetectorIds: string[], motionSensorIds: string[]) {
    super(roomName, GroupType.Presence);
    this.deviceCluster.deviceMap.set(DeviceClusterType.PresenceDetection, new DeviceList(presenceDetectorIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.MotionDetection, new DeviceList(motionSensorIds));
  }

  public initCallbacks(): void {
    this.getPresenceSensors().forEach((p) => {
      p.addPresenceCallback((val) => {
        if (!val) {
          return;
        }
        if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !p.excludeFromNightAlarm)) {
          RoomService.startIntrusionAlarm(this.getRoom(), p);
        }
        RoomService.movementHistory.add(`${Utils.nowString()}: Raum "${this.roomName}" Gerät "${p.info.fullName}"`);
      });
    });
    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((val) => {
        if (!val) {
          return;
        }
        if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !b.excludeFromNightAlarm)) {
          RoomService.startIntrusionAlarm(this.getRoom(), b);
        }
        RoomService.movementHistory.add(`${Utils.nowString()}: Raum "${this.roomName}" Gerät "${b.info.fullName}"`);
      });
    });
    if (this.getRoom().settings.lichtSonnenAufgangAus && this.getRoom().settings.lampOffset) {
      const cb: TimeCallback = new TimeCallback(
        `${this.roomName} Morgens Lampe aus`,
        TimeCallbackType.Sunrise,
        () => {
          this.log(LogLevel.Info, `Es ist hell genug --> Schalte Lampen im ${this.roomName} aus`);
          this.getRoom().LampenGroup?.switchAll(false);
        },
        this.getRoom().settings.lampOffset.sunrise,
      );
      this.getRoom().sonnenAufgangLichtCallback = cb;
      TimeCallbackService.addCallback(cb);
    }

    this.addLastLeftCallback(() => {
      this.getRoom().LampenGroup?.switchAll(false);
    });

    if (this.getRoom().settings.lampenBeiBewegung) {
      this.addFirstEnterCallback(() => {
        this.log(LogLevel.DeepTrace, `Bewegung im Raum ${this.roomName} festgestellt --> Licht einschalten`);
        this.getRoom().setLightTimeBased();
      });
    }
  }

  public presentAmount(): number {
    let count = 0;
    for (let i = 0; i < this.getPresenceSensors().length; i++) {
      if (this.getPresenceSensors()[i].presenceDetected) {
        count++;
      }
    }
    for (let i = 0; i < this.getMotionDetector().length; i++) {
      if (this.getMotionDetector()[i].movementDetected) {
        count++;
      }
    }

    return count;
  }

  public anyPresent(): boolean {
    for (let i = 0; i < this.getPresenceSensors().length; i++) {
      if (this.getPresenceSensors()[i].presenceDetected) {
        return true;
      }
    }
    for (let i = 0; i < this.getMotionDetector().length; i++) {
      if (this.getMotionDetector()[i].movementDetected) {
        return true;
      }
    }

    return false;
  }

  public lastLeftCB(val: boolean, cb: () => void): void {
    if (val) {
      return;
    }

    if (this.anyPresent()) {
      return;
    }

    let timeAfterReset: number =
      Utils.nowMS() - this._lastMovement.getTime() - this.getRoom().settings.movementResetTimer * 1000;
    if (timeAfterReset > 0) {
      this.log(
        LogLevel.Debug,
        `Movement reset. Active Motions: ${this.presentAmount()}\tTime after Last Movement including Reset: ${timeAfterReset}`,
      );
      cb();
      return;
    }
    this.log(LogLevel.Debug, `Movement reset in ${this.roomName} delayed.`);
    Utils.guardedTimeout(
      () => {
        timeAfterReset =
          Utils.nowMS() - this._lastMovement.getTime() - this.getRoom().settings.movementResetTimer * 1000;
        this.log(
          LogLevel.Debug,
          `Delayed Movement reset. Active Motions: ${this.presentAmount()}\tTime after Last Movement including Reset: ${timeAfterReset}`,
        );
        if (!this.anyPresent() && timeAfterReset > 0) {
          cb();
        }
      },
      Math.abs(timeAfterReset) + 500,
      this,
    );
  }

  public addLastLeftCallback(cb: () => void): void {
    this.getPresenceSensors().forEach((p) => {
      p.addPresenceCallback((val) => {
        this.lastLeftCB(val, cb);
      });
    });
    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((val) => {
        this.lastLeftCB(val, cb);
      });
    });
  }

  private firstEnterCallback(val: boolean, cb: () => void): void {
    if (!val) {
      return;
    }
    this._lastMovement = new Date();
    if (this.presentAmount() > 1) {
      return;
    }

    cb();
  }

  public addFirstEnterCallback(cb: () => void): void {
    this.getPresenceSensors().forEach((p) => {
      p.addPresenceCallback((val) => {
        this.firstEnterCallback(val, cb);
      });
    });
    this.getMotionDetector().forEach((b) => {
      b.addMovementCallback((val) => {
        this.firstEnterCallback(val, cb);
      });
    });
  }
}
