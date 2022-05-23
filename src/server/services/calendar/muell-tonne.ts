import { OwnSonosDevice, SonosService } from '../Sonos';
import { ServerLogService } from '../log-service';
import { TelegramService } from '../Telegram';
import { LogLevel } from '../../../models';

export class MuellTonne {
  public static oneDay: number = 1000 * 60 * 60 * 24;
  public nextDate: Date | undefined = undefined;
  public dates: Date[] = [];

  public constructor(public name: string, public ownSonosDevice?: OwnSonosDevice) {}

  public sortDates(): void {
    this.dates = this.dates.sort((a, b) => a.getTime() - b.getTime());
    this.removePassedDates();
    if (this.nextDate !== undefined) {
      ServerLogService.writeLog(
        LogLevel.Info,
        `Die "${this.name}" ist das nächste mal am ${this.nextDate.toLocaleDateString('de-DE')} zu leeren`,
      );
    }
  }

  public removePassedDates(): void {
    const todayMidnight: number = new Date().setHours(0, 0, 0, 0);
    while (this.dates.length > 0 && this.dates[0].getTime() < todayMidnight) {
      this.dates.shift();
    }
    this.nextDate = this.dates[0];
  }

  public check(): void {
    this.removePassedDates();
    if (this.nextDate === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Die Mülltonne mit dem Namen ${this.name} hat keine nächste Abholung!`);
      return;
    }
    const todayMidnight: number = new Date().setHours(0, 0, 0, 0);
    const todayMidnightDate: Date = new Date(todayMidnight);
    const tomorowMidnight: number = new Date(todayMidnight).setDate(todayMidnightDate.getDate() + 1);
    const tomorowAfterMidnight: number = new Date(todayMidnight).setDate(todayMidnightDate.getDate() + 2);
    const nextTimestamp: number = this.nextDate.getTime();

    const daysTilNextEvent: number = (nextTimestamp - todayMidnight) / MuellTonne.oneDay;
    ServerLogService.writeLog(
      LogLevel.Info,
      `Die Mülltonne mit dem Namen ${this.name} wird in ${daysTilNextEvent} Tagen das nächste Mal abgeholt.`,
    );

    if (nextTimestamp >= tomorowAfterMidnight) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Die Mülltonne mit dem Namen ${this.name} wird erst nach Übermorgen abgeholt`,
      );
      return; // Es ist noch lange hin
    }

    if (nextTimestamp >= tomorowMidnight) {
      const message = `Die Mülltonne mit dem Namen ${this.name} wird morgen abgeholt!`;
      TelegramService.inform(message);

      if (this.ownSonosDevice) {
        SonosService.speakOnDevice(message, this.ownSonosDevice, 30);
      }
      return;
    }

    if (nextTimestamp >= todayMidnight) {
      if (new Date().getHours() > 10) {
        const message = `Die Mülltonne mit dem Namen ${this.name} wurde heute abgeholt, Mülltonne zurückstellen!`;
        TelegramService.inform(message);
        if (this.ownSonosDevice) {
          SonosService.speakOnDevice(message, this.ownSonosDevice, 30);
        }
      } else {
        const message = `Die Mülltonne mit dem Namen ${this.name} wird heute abgeholt!`;
        TelegramService.inform(message);
        if (this.ownSonosDevice) {
          SonosService.speakOnDevice(message, this.ownSonosDevice, 30);
        }
      }
      return;
    }
  }
}
