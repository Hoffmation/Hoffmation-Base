import { async, VEvent } from 'node-ical';
import { LogLevel, TimeCallback, TimeCallbackType } from '../../../models';
import { iMuellSettings } from '../../config';
import { ServerLogService } from '../log-service';
import { Utils } from '../utils';
import { MuellTonne } from './muell-tonne';
import { TimeCallbackService } from '../time-callback-service';
import { ISpeaker } from '../../devices';

export class MuellService {
  public static alleTonnen: Array<{ name: string; date: Date }> = [];
  public static blaueTonne: MuellTonne;
  public static graueTonne: MuellTonne;
  public static gelbeTonne: MuellTonne;
  public static brauneTonne: MuellTonne;
  public static loadingPending: boolean = true;
  public static updateTimeCallback: TimeCallback;
  public static checkTimeCallback: TimeCallback;
  public static months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  private static lastCheck: Date = new Date(0);
  private static _calendarURL: string;
  private static _active: boolean = false;
  private static defaultSpeaker: ISpeaker | undefined = undefined;

  public static intialize(config: iMuellSettings, defaultSpeaker: ISpeaker | undefined): void {
    this.defaultSpeaker = defaultSpeaker;
    this._active = true;
    this._calendarURL = config.calendarURL;
    this.updateTimeCallback = new TimeCallback(
      'MuelltonnenServiceUpdater',
      TimeCallbackType.TimeOfDay,
      () => {
        this.updateCalendar(false);
      },
      0,
      2,
      0,
    );
    TimeCallbackService.addCallback(this.updateTimeCallback);

    this.checkTimeCallback = new TimeCallback(
      'MuelltonnenServiceChecker',
      TimeCallbackType.TimeOfDay,
      () => {
        this.checkAll();
      },
      0,
      18,
      0,
    );
    TimeCallbackService.addCallback(this.checkTimeCallback);

    this.updateCalendar();
  }

  public static updateCalendar(checkAfterwards: boolean = true): void {
    ServerLogService.writeLog(LogLevel.Debug, `Muell Service wird nun initialisiert`);
    async
      .fromURL(this._calendarURL)
      .then((data) => {
        this.loadingPending = false;
        this.gelbeTonne = new MuellTonne('Gelbe Tonne', this.defaultSpeaker);
        this.graueTonne = new MuellTonne('Graue Tonne', this.defaultSpeaker);
        this.blaueTonne = new MuellTonne('Blaue Tonne', this.defaultSpeaker);
        this.brauneTonne = new MuellTonne('Braune Tonne', this.defaultSpeaker);
        this.alleTonnen = [];
        const todayMidnight: number = new Date().setHours(0, 0, 0, 0);
        for (const k in data) {
          if (!Object.prototype.hasOwnProperty.call(data, k)) {
            continue;
          }

          if (data[k].type !== 'VEVENT') {
            continue;
          }

          const ev = data[k] as VEvent;
          ServerLogService.writeLog(
            LogLevel.DeepTrace,
            `${ev.summary} is in ${ev.location} on the ${ev.start.getDate()} of ${
              this.months[ev.start.getMonth()]
            } at ${ev.start.toLocaleTimeString('en-GB')}`,
          );

          if (ev.start.getTime() < todayMidnight) {
            continue;
          }

          this.alleTonnen.push({ name: ev.summary, date: ev.start });
          switch (ev.summary) {
            case this.gelbeTonne.name:
              this.gelbeTonne.dates.push(ev.start);
              break;
            case this.graueTonne.name:
              this.graueTonne.dates.push(ev.start);
              break;
            case this.blaueTonne.name:
              this.blaueTonne.dates.push(ev.start);
              break;
            case this.brauneTonne.name:
              this.brauneTonne.dates.push(ev.start);
              break;
            default:
              ServerLogService.writeLog(LogLevel.Warn, `Unbekannte Mülltonne (${ev.summary})`);
          }
        }

        this.gelbeTonne.sortDates();
        this.graueTonne.sortDates();
        this.blaueTonne.sortDates();
        this.brauneTonne.sortDates();
        this.alleTonnen = this.alleTonnen.sort((a, b) => a.date.getTime() - b.date.getTime());
        if (checkAfterwards) {
          this.checkAll();
        }
      })
      .catch((r) => {
        this.loadingPending = true;
        ServerLogService.writeLog(LogLevel.Error, `Loading Trash Calendar failed with error: "${r}"`);
      });
  }

  public static checkAll(pRetries: number = 10): void {
    if (!this._active) {
      return;
    }

    const now: Date = new Date();
    if (now.getTime() - this.lastCheck.getTime() < 60000 && now.getDate() === this.lastCheck.getDate()) {
      ServerLogService.writeLog(LogLevel.Trace, `MüllService.checkAll: Skipped weil wir gerade erst geprüft hatten.`);
      return;
    }

    if (this.gelbeTonne === undefined) {
      if (pRetries > 0) {
        ServerLogService.writeLog(LogLevel.Warn, `Der Müllservice ist noch nicht bereit --> warten`);
        Utils.guardedTimeout(() => {
          MuellService.checkAll(pRetries - 1);
        }, 1000);
      } else {
        ServerLogService.writeLog(LogLevel.Error, `Der Müllservice ist trotz Warten nicht bereit --> Abbruch`);
      }

      return;
    }

    this.lastCheck = now;
    this.gelbeTonne.check();
    this.graueTonne.check();
    this.blaueTonne.check();
    this.brauneTonne.check();
  }
}
