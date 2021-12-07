import { HmIpGriff } from './hmIpGriff';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { HmIpRoll } from './hmIpRoll';
import { ZigbeeAquaraVibra } from '../zigbee/zigbeeAquaraVibra';
import { FensterPosition } from './FensterPosition';
import { TimeCallbackService, TimeOfDay } from '../../services/time-callback-service';
import { LogLevel } from '../../../models/logLevel';

export class Fenster {
  public desiredPosition: number = 0;

  /**
   * sets the desired Pos and moves rollo to this level
   * @param {number} value
   */
  public setDesiredPosition(value: number): void  {
    this.desiredPosition = value;
    this.restoreDesiredPosition();
  }

  public constructor(
    public room: RoomBase,
    public griffe: HmIpGriff[],
    public vibration: ZigbeeAquaraVibra[],
    public rollo: HmIpRoll | undefined = undefined,
    public noRolloOnSunrise: boolean = false,
  ) {
    for (const griff of griffe) {
      griff.addKippCallback((kipp: boolean) => {
        if (kipp && this.griffeInPosition(FensterPosition.offen) === 0) {
          this.vibration.forEach((element) => {
            element.vibrationBlocked = true;
          });
          const timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.room.Einstellungen.rolloOffset);
          if (TimeCallbackService.darkOutsideOrNight(timeOfDay)) {
            this.rollo?.setLevel(50);
          } else {
            this.rollo?.up();
          }
        }
      });

      griff.addOffenCallback((offen: boolean) => {
        if (offen) {
          this.vibration.forEach((element) => {
            element.vibrationBlocked = true;
          });
          this.rollo?.up();
          return;
        }
      });

      griff.addClosedCallback((geschlossen: boolean) => {
        if (
          geschlossen &&
          this.griffeInPosition(FensterPosition.offen) === 0 &&
          this.griffeInPosition(FensterPosition.kipp) === 0
        ) {
          const now = new Date().getTime();
          this.vibration.forEach((element) => {
            ServerLogService.writeLog(
              LogLevel.Debug,
              `Starte Timeout für Vibrationsdeaktivierung für ${element.info.customName}`,
            );
            Utils.guardedTimeout(() => {
              if (element.vibrationBlockedTimeStamp < now) {
                element.vibrationBlocked = false;
              }
            }, 12000);
          });
          this.restoreDesiredPosition();
        }
      });
    }
    Utils.guardedTimeout(
      () => {
        if (this.rollo) this.rollo.Fenster = this;
        for (const g of this.griffe) {
          g.Fenster = this;
        }
      },
      5,
      this,
    );
  }

  public griffeInPosition(pPosition: FensterPosition): number {
    let count = 0;
    for (const griff of this.griffe) {
      if (griff.position === pPosition) {
        count++;
      }
    }
    return count;
  }

  public rolloPositionChange(pValue: number): void {
    if (!this.room) {
      ServerLogService.writeLog(LogLevel.Error, `Fenster Rollo Update, but this one is not connected to any room!`);
      return;
    }
    ServerLogService.writeLog(LogLevel.Debug, `Rollo Position Change in ${this.room.roomName} to ${pValue}`);

    if (pValue === 0 || pValue === 100) {
      this.room.setLightTimeBased(true);
    }
  }

  public restoreDesiredPosition(): void  {
    this.rollo?.setLevel(this.desiredPosition);
  }
}
