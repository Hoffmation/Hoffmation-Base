import { TimeCallback, TimeCallbackType } from '../../../models/timeCallback';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { WeatherService } from '../../services/weather/weather-service';
import { Fenster } from '../Fenster';
import { FensterPosition } from '../models/FensterPosition';
import { LogLevel } from '../../../models/logLevel';
import { TimeCallbackService, TimeOfDay } from '../../services/time-callback-service';
import { ShutterService } from '../../services/ShutterService';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class FensterGroup extends BaseGroup {
  public constructor(roomName: string, public fenster: Fenster[]) {
    super(roomName, GroupType.WindowGroup);
  }

  public allRolloDown(initial: boolean = false, savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) f.desiredPosition = 0;
      f.getShutter().forEach((shutter) => {
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Fahre das Rollo zum Sonnenuntergang ${initial ? '(ggf. nachträglich) ' : ''}für ${
            shutter.info.customName
          } runter`,
        );
        ShutterService.down(shutter, initial);
      });
    });
  }

  public allRolloUp(savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) {
        f.desiredPosition = 100;
      }
      f.getShutter().forEach((shutter) => {
        ServerLogService.writeLog(LogLevel.Debug, `Fenster.allRolloUp for ${shutter.info.customName}`);
        ShutterService.up(shutter, false);
      });
    });
  }

  public allRolloToLevel(level: number, savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) {
        f.desiredPosition = level;
      }
      f.getShutter().forEach((shutter) => {
        shutter.setLevel(level, false);
      });
    });
  }

  public initCallbacks(): void {
    const room: RoomBase = this.getRoom();
    if (room.Einstellungen.sonnenAufgangRollos && room.Einstellungen.rolloOffset) {
      ServerLogService.writeLog(LogLevel.Trace, `Sonnenaufgang TimeCallback für ${this.roomName} hinzufügen`);
      room.sonnenAufgangCallback = new TimeCallback(
        `${this.roomName} Sonnenaufgang Rollos`,
        TimeCallbackType.Sunrise,
        () => {
          if (room.skipNextRolloUp) {
            room.skipNextRolloUp = false;
            return;
          }
          this.sunriseUp();
        },
        room.Einstellungen.rolloOffset.sunrise,
        undefined,
        undefined,
        room.Einstellungen.rolloOffset,
      );
      if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(room.Einstellungen.rolloOffset))) {
        this.sunriseUp(true);
      }
      TimeCallbackService.addCallback(room.sonnenAufgangCallback);
    }

    if (room.Einstellungen.sonnenUntergangRollos && room.Einstellungen.rolloOffset) {
      room.sonnenUntergangCallback = new TimeCallback(
        `${this.roomName} Sonnenuntergang Rollo`,
        TimeCallbackType.SunSet,
        () => {
          this.sunsetDown();
        },
        room.Einstellungen.rolloOffset.sunset,
      );
      if (TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(room.Einstellungen.rolloOffset))) {
        Utils.guardedTimeout(
          () => {
            this.allRolloDown(true, true);
          },
          60000,
          this,
        );
      }
      TimeCallbackService.addCallback(room.sonnenUntergangCallback);
    }

    if (room.Einstellungen.rolloHeatReduction) {
      Utils.guardedInterval(this.setRolloByWeatherStatus, 15 * 60 * 1000, this, true);
      Utils.guardedTimeout(this.setRolloByWeatherStatus, 2 * 60 * 1000, this);
    }
  }

  private sunsetDown(): void {
    this.allRolloToLevel(0, true);
    const room: RoomBase = this.getRoom();
    if (room.PraesenzGroup?.anyPresent() && room.Einstellungen.lampOffset) {
      room.LampenGroup?.switchTimeConditional(TimeCallbackService.dayType(room.Einstellungen.lampOffset));
    }
  }

  public setRolloByWeatherStatus(): void {
    const room: RoomBase = this.getRoom();
    const timeOfDay: TimeOfDay = TimeCallbackService.dayType(room.Einstellungen.rolloOffset);
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(timeOfDay);
    this.fenster.forEach((f) => {
      if (f.getShutter().length === 0) {
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
          room.HeatGroup?.desiredTemp ?? -99,
          room.HeatGroup?.currentTemp ?? -99,
        );
      }
      if (f.griffeInPosition(FensterPosition.offen) > 0 && desiredPos < 100) {
        return;
      }
      if (f.griffeInPosition(FensterPosition.kipp) > 0) {
        desiredPos = Math.max(30, desiredPos);
      }
      f.getShutter().forEach((shutter) => {
        if (shutter.currentLevel === desiredPos) {
          // Rollo ist bereits auf der Zielposition
          return;
        }
        shutter.setLevel(desiredPos, false, true);
      });
    });
  }

  public sunriseUp(initial: boolean = false): void {
    this.fenster.forEach((f) => {
      if (f.noRolloOnSunrise || f.getShutter().length === 0) {
        return;
      }
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Fahre das Rollo zum Sonnenaufgang ${initial ? '(ggf. nachträglich)' : ''} hoch`,
      );
      f.setDesiredPosition(100);
    });
  }

  public restoreRolloPosition(recalc: boolean = false): void {
    if (!recalc) {
      this.fenster.forEach((f) => {
        f.restoreDesiredPosition();
      });
      return;
    }
    if (
      !TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(this.getRoom().Einstellungen.rolloOffset))
    ) {
      this.sunriseUp(true);
    } else {
      this.sunsetDown();
    }
  }
}
