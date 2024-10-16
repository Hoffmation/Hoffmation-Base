import { WeatherMinutes } from './weather-minutes';
import { WeatherAlert } from './weather-alert';
import { iWeatherSettings } from '../../config';
import { LogLevel, ShutterSettings } from '../../../models';
import { HTTPSOptions } from '../HTTPSOptions';
import { HTTPSService } from '../https-service';
import { Utils } from '../utils';
import { LogDebugType, ServerLogService } from '../log-service';
import SunCalc from 'suncalc';
import { TimeCallbackService } from '../time-callback-service';
import { iSpeaker, UNDEFINED_TEMP_VALUE } from '../../devices';
import { WeatherResponse } from './weather-response';
import { RainNextMinutesInfo } from './rain-next-minutes-info';

export class WeatherService {
  /**
   * Whether the service is active or not
   */
  public static active: boolean = false;
  /**
   * The milliseconds of one day
   */
  public static readonly oneDay: number = 1000 * 60 * 60 * 24;
  /**
   * The last weather response
   */
  public static lastResponse: WeatherResponse | undefined;
  /**
   * The sun horizontal degree (0 is North)
   */
  public static sunDirection: number;
  private static _dataUpdateCbs: { [name: string]: () => void } = {};
  private static _refreshInterval: NodeJS.Timeout | undefined;
  private static latitude: string;
  private static longitude: string;
  private static appID?: string;

  public static addWeatherUpdateCb(name: string, cb: () => void) {
    this._dataUpdateCbs[name] = cb;
  }

  public static get todayMaxTemp(): number {
    return WeatherService.lastResponse?.daily[0]?.temp.max ?? UNDEFINED_TEMP_VALUE;
  }

  public static initialize(config: iWeatherSettings): void {
    this.active = true;
    this.longitude = config.longitude;
    this.latitude = config.lattitude;
    this.appID = config.appid;

    this._refreshInterval = Utils.guardedInterval(WeatherService.update, 10 * 60 * 1000, WeatherService, true);
  }

  public static update(): void {
    this.recalcAzimuth();
    this.getWeatherData();
  }

  public static stopInterval(): void {
    if (this._refreshInterval !== undefined) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = undefined;
    }
  }

  public static playWeatherInfo(speaker: iSpeaker, volume: number = 30, short: boolean = false, retries = 5): void {
    const wData: WeatherResponse | undefined = WeatherService.lastResponse;
    if (wData === undefined) {
      if (retries > 0) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          'WeatherService.playWeatherInfo(): Der Wetterbericht ist noch nicht bereit --> warten',
        );
        setTimeout(() => {
          WeatherService.playWeatherInfo(speaker, volume, short, retries - 1);
        }, 1000);
      } else {
        ServerLogService.writeLog(
          LogLevel.Error,
          'WeatherService.playWeatherInfo(): Der Wetterbericht ist vorhanden --> Abbruch',
        );
      }
      return;
    }

    speaker.speakOnDevice(short ? 'Kurze Wetterinfo:' : 'HoffMation Wetter-Bericht:', volume, false);
    speaker.speakOnDevice(`Wetterbeschreibung für heute:  ${wData.daily[0].weather[0].description}`, volume, false);
    speaker.speakOnDevice(`Aktuell sind es ${Math.round(wData.current.temp)} Grad.`, volume, false);
    if (!short) {
      speaker.speakOnDevice(
        `Heute sollen es im Durchschnitt ${Math.round(wData.daily[0].temp.day)} Grad sein.`,
        volume,
        false,
      );
      speaker.speakOnDevice(
        `Die Höchsttemperatur liegt heute bei ${Math.round(wData.daily[0].temp.max)} Grad.`,
        volume,
        false,
      );
      speaker.speakOnDevice(
        `Die Tiefsttemperatur soll heute ${Math.round(wData.daily[0].temp.min)} Grad betragen.`,
        volume,
        false,
      );
      if (wData.daily[0].rain !== undefined) {
        speaker.speakOnDevice(
          `Es sollen heute etwa ${Math.round(wData.daily[0].rain)} Millimeter Regen fallen.`,
          volume,
          false,
        );
      }
    }
    if (wData.daily[0].snow !== undefined && wData.daily[0].snow > 0) {
      speaker.speakOnDevice(
        `Heute wird es Schneien! Es werden etwa ${Math.round(wData.daily[0].snow)} Millimeter Schnee erwartet.`,
        volume,
        false,
      );
    }

    const { minutes, precipitation } = WeatherService.getRainNextMinutes();
    const ratio: number = minutes <= 0 ? 0 : (precipitation / minutes) * 60;
    let message = 'In der nächsten Zeit ';
    switch (true) {
      case ratio > 12:
        message += 'wird es kräftig regnen';
        break;
      case ratio > 4:
        message += 'wird es ordentlich regnen';
        break;
      case ratio > 1:
        message += 'wird es regnen';
        break;
      case ratio > 0.5:
        message += 'wird es mäßig regnen';
        break;
      case ratio > 0.1:
        message += 'wird es nieseln regnen';
        break;
      default:
        message += 'bleibt es trocken.';
        break;
    }
    speaker.speakOnDevice(message, volume, false);
    if (!short && precipitation > 0) {
      speaker.speakOnDevice(
        `Es werden etwa ${precipitation} Millimeter Niederschlag in den nächsten ${minutes} Minuten fallen`,
        volume,
        false,
      );
    }

    const alerts: WeatherAlert[] = WeatherService.getActiveAlerts();
    if (alerts.length > 0) {
      const alertMessage: string[] = ['Achtung, vorliegende Wetterwarnungen:'];
      alerts.forEach((element) => {
        alertMessage.push(
          `${element.event} von ${new Date(element.start * 1000).toLocaleString('de-DE')} bis ${new Date(
            element.end * 1000,
          ).toLocaleString('de-DE')}`,
        );
        // } bis ${new Date(element.end * 1000).toLocaleString("de-DE")}; Beschreibung: ${element.description} Herausgeber: ${element.sender_name}`)
      });
      speaker.speakOnDevice(alertMessage.join('\n'), volume, false);
    } else if (!short) {
      speaker.speakOnDevice('Für heute liegt keine Unwetterwarnungen vor', volume, false);
    }
  }

  public static processHourlyWeather(response: WeatherResponse): void {
    this.lastResponse = response;
    ServerLogService.writeLog(
      LogLevel.Info,
      `Es sind gerade ${this.lastResponse.current.temp} Grad (gefühlt ${this.lastResponse.current.feels_like}).`,
    );
    if (this.lastResponse.alerts !== undefined && this.lastResponse.alerts.length > 0) {
      const message: string[] = ['Es gibt folgende Wetterwarnungen:'];
      this.lastResponse.alerts.forEach((element) => {
        message.push(
          `${element.event} von ${new Date(element.start * 1000)} bis ${new Date(element.end * 1000)}; Beschreibung: ${
            element.description
          } Herausgeber: ${element.sender_name}`,
        );
      });
      ServerLogService.writeLog(LogLevel.Info, message.join('\n'));
    }
  }

  public static get currentTemp(): number {
    if (WeatherService.lastResponse?.current === undefined) {
      ServerLogService.writeLog(LogLevel.Info, 'WeatherService.isOutsideWarmer(): There are no data yet');
      return -99;
    }
    return WeatherService.lastResponse.current.temp;
  }

  public static willOutsideBeWarmer(
    referenceTemperature: number,
    logger: (level: LogLevel, message: string, debugType?: LogDebugType) => void,
  ): boolean {
    const wData: WeatherResponse | undefined = WeatherService.lastResponse;
    if (wData === undefined || wData.current === undefined) {
      logger(LogLevel.Info, 'WeatherService.isOutsideWarmer(): There are no data yet');
      return false;
    }
    logger(
      LogLevel.Info,
      `willOutsideBeWarmer(${referenceTemperature}) --> Today Max Temperature: ${wData.daily[0].temp.max}`,
    );
    return referenceTemperature < wData.daily[0].temp.max;
  }

  public static weatherRolloPosition(
    normalPos: number,
    desiredTemperatur: number,
    currentTemperatur: number,
    logger: (level: LogLevel, message: string, debugType?: LogDebugType) => void,
    shutterSettings: ShutterSettings,
  ): number {
    let result: number = normalPos;
    if (currentTemperatur < desiredTemperatur) {
      logger(LogLevel.Trace, 'RolloWeatherPosition: Room needs to heat up anyways.');
      return result;
    } else if (normalPos < 30) {
      logger(LogLevel.Trace, 'RolloWeatherPosition: Shutter should be down anyways.');
      return result;
    } else if (this.hoursTilSunset() < 1) {
      logger(LogLevel.Trace, "RolloWeatherPosition: It's close to or after todays sunset");
      return result;
    } else if (
      shutterSettings.direction !== undefined &&
      !Utils.degreeInBetween(shutterSettings.direction - 50, shutterSettings.direction + 50, this.sunDirection)
    ) {
      logger(LogLevel.Trace, 'RolloWeatherPosition: Sun is facing a different direction');
      return result;
    } else if (this.getCurrentCloudiness() > 40) {
      logger(LogLevel.Trace, 'RolloWeatherPosition: It´s cloudy now.');
    } else if (this.willOutsideBeWarmer(26, logger)) {
      result = shutterSettings.heatReductionPosition;
    }

    if (result !== normalPos) {
      logger(
        LogLevel.Info,
        `weatherRolloPosition(${normalPos}, ${desiredTemperatur}, ${currentTemperatur}) --> Target: ${result}`,
      );
    }
    return result;
  }

  public static getCurrentCloudiness(): number {
    const wData: WeatherResponse | undefined = WeatherService.lastResponse;
    if (wData === undefined || wData.current === undefined) {
      ServerLogService.writeLog(LogLevel.Info, 'WeatherService.getCurrentCloudiness(): There are no data yet');
      return 0;
    }
    return wData.current.clouds;
  }

  private static getRainNextMinutes(): RainNextMinutesInfo {
    const minutes: WeatherMinutes[] | undefined = WeatherService.lastResponse?.minutely;
    let minutesUsed = 0;
    let precipitation = 0;
    if (minutes !== undefined) {
      const now: number = new Date().getTime();
      minutes.forEach((element) => {
        if (element.dt * 1000 > now) {
          minutesUsed++;
          precipitation += element.precipitation;
        }
      });
    }

    return { minutes: minutesUsed, precipitation: precipitation };
  }

  private static getActiveAlerts(): WeatherAlert[] {
    const result: WeatherAlert[] = [];
    if (WeatherService.lastResponse?.alerts === undefined || WeatherService.lastResponse.alerts.length === 0) {
      return result;
    }
    const now: number = new Date().getTime();
    const todayMidnight: number = new Date().setHours(0, 0, 0, 0);
    const tomorowMidnight: number = todayMidnight + WeatherService.oneDay;

    WeatherService.lastResponse.alerts.forEach((element) => {
      const timestampStart: number = element.start * 1000;
      if (
        (timestampStart > todayMidnight && timestampStart < tomorowMidnight) ||
        (timestampStart < now && element.end * 1000 > now)
      ) {
        result.push(element);
      }
    });
    return result;
  }

  private static getWeatherData(): void {
    if (!this.appID) {
      return;
    }
    const host: string = 'api.openweathermap.org';
    const path: string = `/data/3.0/onecall?lat=${WeatherService.latitude}&lon=${WeatherService.longitude}&appid=${WeatherService.appID}&units=metric&lang=de`;
    HTTPSService.request(new HTTPSOptions(host, path, {}, 'GET', 443), '', 5, (response: string) => {
      ServerLogService.writeLog(LogLevel.Debug, 'WeatherAPi Response erhalten');
      ServerLogService.writeLog(LogLevel.DeepTrace, `WeatherAPi Response: ${response}`);
      Utils.guardedFunction(
        () => {
          const responseObj: WeatherResponse = JSON.parse(response);
          WeatherService.processHourlyWeather(responseObj);
          for (const dataUpdateCbsKey in this._dataUpdateCbs) {
            this._dataUpdateCbs[dataUpdateCbsKey]();
          }
        },
        this,
        `Response from Weather API call at https://${host}/${path}: ${response}`,
      );
    });
  }

  private static recalcAzimuth(): void {
    this.sunDirection =
      180 +
      (180 / Math.PI) * SunCalc.getPosition(new Date(), parseFloat(this.latitude), parseFloat(this.longitude)).azimuth;
  }

  /**
   * Method to calculate the hours until sunset based on the current location
   * @returns - The hours until sunset
   */
  private static hoursTilSunset(): number {
    const now: Date = new Date();
    const sunset: Date = TimeCallbackService.getSunsetForDate(
      now,
      parseFloat(this.latitude),
      parseFloat(this.longitude),
    );
    return (sunset.getTime() - now.getTime()) / (1000 * 60 * 60);
  }
}
