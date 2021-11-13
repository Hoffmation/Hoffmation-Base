import { LogLevel } from '../../../models/logLevel';
import { Fenster } from '../hmIPDevices/Fenster';
import { FensterPosition } from '../hmIPDevices/FensterPosition';
import { ServerLogService } from '../../services/log-service';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { TimeCallback, TimeCallbackType } from '../../../models/timeCallback';
import { TimeCallbackService, TimeOfDay } from '../../services/time-callback-service';
import { Utils } from '../../services/utils/utils';
import { WeatherService } from '../../services/weather/weather-service';

export class FensterGroup {
  public constructor(private _room: RoomBase, public fenster: Fenster[]) {
    for (const f of [...fenster]) {
      f.room = this._room;
    }
  }

  public allRolloDown(initial: boolean = false, savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) f.desiredPosition = 0;
      if (f.rollo !== undefined) {
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Fahre das Rollo zum Sonnenuntergang ${initial ? '(ggf. nachträglich) ' : ''}für ${
            f.rollo.info.customName
          } runter`,
        );
        f.rollo.down(initial);
      }
    });
  }

  public allRolloUp(savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (f.rollo === undefined) {
        return;
      }

      if (savePosition) {
        f.desiredPosition = 100;
      }
      f.rollo.up(false);
    });
  }

  public allRolloToLevel(level: number, savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) {
        f.desiredPosition = level;
      }
      if (f.rollo !== undefined) {
        f.rollo.setLevel(level, false);
      }
    });
  }

  public initCallbacks(): void {
    if (this._room.Einstellungen.sonnenAufgangRollos && this._room.Einstellungen.rolloOffset) {
      ServerLogService.writeLog(LogLevel.Trace, `Sonnenaufgang TimeCallback für ${this._room.roomName} hinzufügen`);
      this._room.sonnenAufgangCallback = new TimeCallback(
        `${this._room.roomName} Sonnenaufgang Rollos`,
        TimeCallbackType.Sunrise,
        () => {
          if (this._room.skipNextRolloUp) {
            this._room.skipNextRolloUp = false;
            return;
          }
          this.sunriseUp();
        },
        this._room.Einstellungen.rolloOffset.sunrise,
        undefined,
        undefined,
        this._room.Einstellungen.rolloOffset,
      );
      if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(this._room.Einstellungen.rolloOffset))) {
        this.sunriseUp(true);
      }
      TimeCallbackService.addCallback(this._room.sonnenAufgangCallback);
    }

    if (this._room.Einstellungen.sonnenUntergangRollos && this._room.Einstellungen.rolloOffset) {
      this._room.sonnenUntergangCallback = new TimeCallback(
        `${this._room.roomName} Sonnenuntergang Rollo`,
        TimeCallbackType.SunSet,
        () => {
          this.sunsetDown();
        },
        this._room.Einstellungen.rolloOffset.sunset,
      );
      if (TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(this._room.Einstellungen.rolloOffset))) {
        Utils.guardedTimeout(
          () => {
            this.allRolloDown(true, true);
          },
          60000,
          this,
        );
      }
      TimeCallbackService.addCallback(this._room.sonnenUntergangCallback);
    }

    if (this._room.Einstellungen.rolloHeatReduction) {
      Utils.guardedInterval(this.setRolloByWeatherStatus, 15 * 60 * 1000, this, true);
      Utils.guardedTimeout(this.setRolloByWeatherStatus, 2 * 60 * 1000, this);
    }
  }

  private sunsetDown(): void {
    this.allRolloToLevel(0, true);
    if (this._room.PraesenzGroup.anyPresent() && this._room.Einstellungen.lampOffset) {
      this._room.LampenGroup.switchTimeConditional(TimeCallbackService.dayType(this._room.Einstellungen.lampOffset));
    }
  }

  public setRolloByWeatherStatus(): void {
    const timeOfDay: TimeOfDay = TimeCallbackService.dayType(this._room.Einstellungen.rolloOffset);
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(timeOfDay);
    this.fenster.forEach((f) => {
      if (!f.rollo) {
        return;
      }
      if (darkOutside) {
        f.restoreDesiredPosition();
        return;
      }
      let desiredPos: number = f.desiredPosition;
      if (desiredPos > 0) {
        WeatherService.weatherRolloPosition(
          desiredPos,
          this._room.HeatGroup.desiredTemp,
          this._room.HeatGroup.currentTemp,
        );
      }
      if (f.griffeInPosition(FensterPosition.offen) > 0 && desiredPos < 100) {
        return;
      }
      if (f.griffeInPosition(FensterPosition.kipp) > 0) {
        desiredPos = Math.max(30, desiredPos);
      }
      if (f.rollo.currentLevel === desiredPos) {
        // Rollo ist bereits auf der Zielposition
        return;
      }
      f.rollo.setLevel(desiredPos, false, true);
    });
  }

  public sunriseUp(initial: boolean = false): void {
    this.fenster.forEach((f) => {
      if (!f.noRolloOnSunrise && f.rollo) {
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Fahre das Rollo zum Sonnenaufgang ${initial ? '(ggf. nachträglich)' : ''}für ${
            f.rollo.info.customName
          } hoch`,
        );
        f.setDesiredPosition(100);
      }
    });
  }

  public restoreRolloPosition(recalc: boolean = false): void {
    if (!recalc) {
      this.fenster.forEach((f) => {
        f.restoreDesiredPosition();
      });
      return;
    }
    if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(this._room.Einstellungen.rolloOffset))) {
      this.sunriseUp(true);
    } else {
      this.sunsetDown();
    }
  }
}
