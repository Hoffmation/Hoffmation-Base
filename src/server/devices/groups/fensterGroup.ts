import { LogLevel, RoomBase, TimeCallback, TimeCallbackType, TimeOfDay } from '../../../models';
import { ShutterService, TimeCallbackService, Utils, WeatherService } from '../../services';
import { Fenster } from './Fenster';
import { FensterPosition } from '../models';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';

export class FensterGroup extends BaseGroup {
  public constructor(roomName: string, public fenster: Fenster[]) {
    super(roomName, GroupType.WindowGroup);
  }

  public allRolloDown(initial: boolean = false, savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) f.desiredPosition = 0;
      ShutterService.windowAllDown(f, initial);
    });
  }

  public allRolloUp(savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) {
        f.desiredPosition = 100;
      }
      ShutterService.windowAllUp(f);
    });
  }

  public allRolloToLevel(level: number, savePosition: boolean = false): void {
    this.fenster.forEach((f) => {
      if (savePosition) {
        f.desiredPosition = level;
      }
      ShutterService.windowAllToPosition(f, level, false);
    });
  }

  public initialize(): void {
    const room: RoomBase = this.getRoom();
    if (room.settings.sonnenAufgangRollos && room.settings.rolloOffset) {
      this.log(LogLevel.Trace, `Sonnenaufgang TimeCallback für ${this.roomName} hinzufügen`);
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
        room.settings.rolloOffset.sunrise,
        undefined,
        undefined,
        room.settings.rolloOffset,
      );
      if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(room.settings.rolloOffset))) {
        this.sunriseUp(true);
      }
      TimeCallbackService.addCallback(room.sonnenAufgangCallback);
    }

    if (room.settings.sonnenUntergangRollos && room.settings.rolloOffset) {
      room.sonnenUntergangCallback = new TimeCallback(
        `${this.roomName} Sonnenuntergang Rollo`,
        TimeCallbackType.SunSet,
        () => {
          this.sunsetDown();
        },
        room.settings.rolloOffset.sunset,
      );
      if (TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(room.settings.rolloOffset))) {
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

    if (room.settings.rolloHeatReduction) {
      Utils.guardedInterval(this.setRolloByWeatherStatus, 15 * 60 * 1000, this, true);
      Utils.guardedTimeout(this.setRolloByWeatherStatus, 2 * 60 * 1000, this);
    }

    this.fenster.forEach((f) => {
      f.initialize();
    });
  }

  public setRolloByWeatherStatus(): void {
    const room: RoomBase = this.getRoom();
    const timeOfDay: TimeOfDay = TimeCallbackService.dayType(room.settings.rolloOffset);
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
      ShutterService.windowAllToPosition(f, desiredPos, false, true);
    });
  }

  public sunriseUp(initial: boolean = false): void {
    this.fenster.forEach((f) => {
      if (f.noRolloOnSunrise || f.getShutter().length === 0) {
        return;
      }
      this.log(LogLevel.Debug, `Fahre das Rollo zum Sonnenaufgang ${initial ? '(ggf. nachträglich)' : ''} hoch`);
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
    if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(this.getRoom().settings.rolloOffset))) {
      this.sunriseUp(true);
    } else {
      this.sunsetDown();
    }
  }

  public changeVibrationMotionBlock(block: boolean): void {
    this.fenster.forEach((f) => {
      if (f.getVibration().length === 0) {
        return;
      }
      f.getVibration().forEach((v) => {
        v.vibrationBlockedByMotion = block;
      });
    });
  }

  private sunsetDown(): void {
    this.allRolloToLevel(0, true);
    const room: RoomBase = this.getRoom();
    if (room.PraesenzGroup?.anyPresent() && room.settings.lampOffset) {
      room.LampenGroup?.switchTimeConditional(TimeCallbackService.dayType(room.settings.lampOffset));
    }
  }
}
