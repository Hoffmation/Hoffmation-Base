import { RoomBase } from '../../../models/rooms/RoomBase';
import { TimeCallback, TimeCallbackType } from '../../../models/timeCallback';
import { HmIpPraezenz } from '../hmIPDevices/hmIpPraezenz';
import { Utils } from '../../services/utils/utils';
import { ServerLogService } from '../../services/log-service';
import { ZigbeeAquaraMotion } from '../zigbee/zigbeeAquaraMotion';
import { LogLevel } from '../../../models/logLevel';
import { TimeCallbackService } from '../../services/time-callback-service';
import { HmIpBewegung } from '../hmIPDevices/hmIpBewegung';
import { RoomService } from '../../services/room-service/room-service';

export class PraesenzGroup {
  private _lastMovement: Date = new Date(0);

  public constructor(
    private _room: RoomBase,
    public Prasenzen: HmIpPraezenz[],
    public Bewegungen: HmIpBewegung[] | ZigbeeAquaraMotion[],
  ) {
    for (const b of [...Prasenzen, ...Bewegungen]) {
      b.room = this._room;
    }
  }

  public initCallbacks(): void {
    this.Prasenzen.forEach((p) => {
      p.addPresenceCallback((val) => {
        if (!val) {
          return;
        }
        if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !p.excludeFromNightAlarm)) {
          RoomService.startIntrusionAlarm(this._room, p);
        }
        RoomService.movementHistory.add(
          `${Utils.nowString()}: Raum "${this._room.roomName}" Gerät "${p.info.fullName}"`,
        );
      });
    });
    this.Bewegungen.forEach((b) => {
      b.addMovementCallback((val) => {
        if (!val) {
          return;
        }
        if (RoomService.awayModeActive || (RoomService.nightAlarmActive && !b.excludeFromNightAlarm)) {
          RoomService.startIntrusionAlarm(this._room, b);
        }
        RoomService.movementHistory.add(
          `${Utils.nowString()}: Raum "${this._room.roomName}" Gerät "${b.info.fullName}"`,
        );
      });
    });
    if (this._room.Einstellungen.lichtSonnenAufgangAus && this._room.Einstellungen.lampOffset) {
      this._room.sonnenAufgangLichtCallback = new TimeCallback(
        `${this._room.roomName} Morgens Lampe aus`,
        TimeCallbackType.Sunrise,
        () => {
          ServerLogService.writeLog(
            LogLevel.Info,
            `Es ist hell genug --> Schalte Lampen im ${this._room.roomName} aus`,
          );
          this._room.LampenGroup?.switchAll(false);
        },
        this._room.Einstellungen.lampOffset.sunrise,
      );
      TimeCallbackService.addCallback(this._room.sonnenAufgangLichtCallback);
    }

    this.addLastLeftCallback(() => {
      this._room.LampenGroup?.switchAll(false);
    });

    if (this._room.Einstellungen.lampenBeiBewegung) {
      this.addFirstEnterCallback(() => {
        ServerLogService.writeLog(
          LogLevel.DeepTrace,
          `Bewegung im Raum ${this._room.roomName} festgestellt --> Licht einschalten`,
        );
        this._room.setLightTimeBased();
      });
    }
  }

  public presentAmount(): number {
    let count = 0;
    for (let i = 0; i < this.Prasenzen.length; i++) {
      if (this.Prasenzen[i].presenceDetected) {
        count++;
      }
    }
    for (let i = 0; i < this.Bewegungen.length; i++) {
      if (this.Bewegungen[i].movementDetected) {
        count++;
      }
    }

    return count;
  }

  public anyPresent(): boolean {
    for (let i = 0; i < this.Prasenzen.length; i++) {
      if (this.Prasenzen[i].presenceDetected) {
        return true;
      }
    }
    for (let i = 0; i < this.Bewegungen.length; i++) {
      if (this.Bewegungen[i].movementDetected) {
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
      Utils.nowMS() - this._lastMovement.getTime() - this._room.Einstellungen.movementResetTimer * 1000;
    if (timeAfterReset > 0) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Movement reset in ${
          this._room.roomName
        }.\nActive Motions: ${this.presentAmount()}\nTime after Last Movement including Reset: ${timeAfterReset}`,
      );
      cb();
      return;
    }
    ServerLogService.writeLog(LogLevel.Debug, `Movement reset in ${this._room.roomName} delayed.`);
    Utils.guardedTimeout(
      () => {
        timeAfterReset =
          Utils.nowMS() - this._lastMovement.getTime() - this._room.Einstellungen.movementResetTimer * 1000;
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Delayed Movement reset in ${
            this._room.roomName
          }.\nActive Motions: ${this.presentAmount()}\nTime after Last Movement including Reset: ${timeAfterReset}`,
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
    this.Prasenzen.forEach((p) => {
      p.addPresenceCallback((val) => {
        this.lastLeftCB(val, cb);
      });
    });
    this.Bewegungen.forEach((b) => {
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
    this.Prasenzen.forEach((p) => {
      p.addPresenceCallback((val) => {
        this.firstEnterCallback(val, cb);
      });
    });
    this.Bewegungen.forEach((b) => {
      b.addMovementCallback((val) => {
        this.firstEnterCallback(val, cb);
      });
    });
  }
}
