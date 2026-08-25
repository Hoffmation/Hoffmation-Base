import SunCalc from 'suncalc';
import { TimeCallbackService } from '../time-callback-service';
import {
  iSpeaker,
  iWeatherSettings,
  UNDEFINED_TEMP_VALUE,
  WeatherAlert,
  WeatherMinutes,
  WeatherResponse,
} from '../../interfaces';
import { Utils } from '../../utils';
import { LogDebugType, LogLevel } from '../../enums';
import { ServerLogService } from '../../logging';
import { HTTPSOptions } from '../HTTPSOptions';
import { HTTPSService } from '../https-service';
import { ShutterSettings } from '../../devices';
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
  /**
   * How many degrees a room has to exceed its desired temperature, before the sun shading
   * triggers on the room temperature alone.
   */
  private static readonly roomOverheatOffset: number = 1;
  private static _dataUpdateCbs: { [name: string]: () => void } = {};
  private static _refreshInterval: NodeJS.Timeout | undefined;
  private static latitude: string;
  private static longitude: string;
  private static appID?: string;
  /**
   * The highest maximum temperature forecast for today (prevents oscillation)
   */
  private static _todayMaxMaxTemperature: number = UNDEFINED_TEMP_VALUE;
  /**
   * The date of the last weather update (for daily reset)
   */
  private static _lastUpdateDate: string = '';

  public static addWeatherUpdateCb(name: string, cb: () => void) {
    this._dataUpdateCbs[name] = cb;
  }

  public static get todayMaxTemp(): number {
    return this._todayMaxMaxTemperature !== UNDEFINED_TEMP_VALUE
      ? this._todayMaxMaxTemperature
      : (WeatherService.lastResponse?.daily[0]?.temp.max ?? UNDEFINED_TEMP_VALUE);
  }

  public static get todayCloudiness(): number | undefined {
    return WeatherService.lastResponse?.daily[0]?.clouds;
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

    // Update daily maximum temperature to prevent shutter oscillation
    this.updateDailyMaxTemperature();

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

  /**
   * Updates the daily maximum temperature to prevent shutter oscillation
   * Tracks the highest forecasted maximum temperature for today
   */
  private static updateDailyMaxTemperature(): void {
    if (!this.lastResponse?.daily?.[0]?.temp?.max) {
      return;
    }

    const today = new Date().toDateString();
    const currentForecastMax = this.lastResponse.daily[0].temp.max;

    if (this._lastUpdateDate === today && currentForecastMax < this._todayMaxMaxTemperature) {
      return;
    }
    this._todayMaxMaxTemperature = currentForecastMax;
    this._lastUpdateDate = today;
    ServerLogService.writeLog(LogLevel.Debug, `Daily max temperature updated to ${currentForecastMax}°C`);
  }

  public static get currentHumidity(): number {
    if (WeatherService.lastResponse?.current === undefined) {
      ServerLogService.writeLog(LogLevel.Info, 'WeatherService.currentHumidity: There is no data yet');
      return -1;
    }
    return WeatherService.lastResponse.current.humidity;
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
    const result: number = normalPos;
    if (currentTemperatur < desiredTemperatur && currentTemperatur < shutterSettings.heatReductionDirectionThreshold) {
      logger(LogLevel.Trace, 'RolloWeatherPosition: Room needs to heat up anyways.');
      return result;
    }
    if (normalPos < shutterSettings.heatReductionPosition) {
      logger(LogLevel.Trace, 'RolloWeatherPosition: Shutter should be down anyways.');
      return result;
    }
    if (this.hoursTilSunset() < 1) {
      logger(LogLevel.Trace, "RolloWeatherPosition: It's close to or after todays sunset");
      return result;
    }

    // How much of the full reduction is warranted right now, between 0 (none) and 1 (full).
    let reductionShare: number;
    if (this.willOutsideBeWarmer(shutterSettings.heatReductionThreshold, logger)) {
      // Insulation regime: at this point the ambient heat outweighs the solar gain, so the closed
      // shutter is worth it as additional window insulation - no matter where the sun stands.
      reductionShare = 1;
    } else if (
      this.willOutsideBeWarmer(shutterSettings.heatReductionDirectionThreshold, logger) ||
      this.isRoomOverheated(desiredTemperatur, currentTemperatur)
    ) {
      // Sun shading regime: only the window the sun actually shines on is worth darkening.
      reductionShare = this.solarExposureShare(shutterSettings, logger) * this.skyClearnessShare(shutterSettings);
    } else {
      logger(LogLevel.Trace, "RolloWeatherPosition: It won't get warm enough today.");
      return result;
    }

    if (reductionShare <= 0) {
      return result;
    }
    const span: number = normalPos - shutterSettings.heatReductionPosition;
    // Quantized to 10% steps, so slight weather changes don't cause constant shutter movement.
    // A full reduction keeps the configured position verbatim, as that one is a deliberate choice.
    const target: number =
      reductionShare >= 1
        ? shutterSettings.heatReductionPosition
        : Math.min(
            normalPos,
            Math.max(shutterSettings.heatReductionPosition, Math.round((normalPos - span * reductionShare) / 10) * 10),
          );
    if (target !== normalPos) {
      logger(
        LogLevel.Info,
        `weatherRolloPosition(${normalPos}, ${desiredTemperatur}, ${currentTemperatur}) --> Target: ${target} ` +
          `(share: ${Utils.round(reductionShare, 2)}, cloudiness: ${this.getCurrentCloudiness()}%, ` +
          `sunDirection: ${Math.round(this.sunDirection)}°, windowDirection: ${shutterSettings.direction}°)`,
      );
    }
    return target;
  }

  /**
   * Determines whether the room is already warmer than wanted.
   *
   * The outside temperature alone cannot answer whether a room needs shading: a low autumn sun
   * shines deep into a south facing room and heats it up considerably while it stays cool outside.
   * The room's own temperature is the honest measure for that, so it may trigger the shading on its own.
   * @param desiredTemperatur - The temperature the room is supposed to have
   * @param currentTemperatur - The temperature the room currently has
   * @returns True if both values are known and the room exceeds the desired temperature noticeably
   */
  private static isRoomOverheated(desiredTemperatur: number, currentTemperatur: number): boolean {
    if (desiredTemperatur <= UNDEFINED_TEMP_VALUE || currentTemperatur <= UNDEFINED_TEMP_VALUE) {
      // Without a heat group we have no room temperature to judge by.
      return false;
    }
    return currentTemperatur >= desiredTemperatur + WeatherService.roomOverheatOffset;
  }

  /**
   * Determines whether the sun currently shines onto this particular window,
   * based on the angle between sun and window direction.
   * @param shutterSettings - The settings of the shutter in question
   * @param logger - The logging function to use
   * @returns 1 while the sun faces the window, 0 otherwise
   */
  private static solarExposureShare(
    shutterSettings: ShutterSettings,
    logger: (level: LogLevel, message: string, debugType?: LogDebugType) => void,
  ): number {
    if (shutterSettings.direction === undefined) {
      // Without a known direction we have to assume the worst case of a fully exposed window.
      return 1;
    }
    const delta: number = Utils.degreeDistance(shutterSettings.direction, this.sunDirection);
    if (delta > shutterSettings.heatReductionDirectionTolerance) {
      logger(LogLevel.Trace, `RolloWeatherPosition: Sun is facing a different direction (${Math.round(delta)}° off).`);
      return 0;
    }
    return 1;
  }

  /**
   * Determines how much solar gain the current sky lets through, as an overcast sky provides
   * too little of it to justify a darkened room.
   * @param shutterSettings - The settings of the shutter in question
   * @returns The share of clear sky, between 0 and 1
   */
  private static skyClearnessShare(shutterSettings: ShutterSettings): number {
    const cloudiness: number = this.getCurrentCloudiness();
    const fullReductionMax: number = shutterSettings.heatReductionCloudinessThreshold;
    const noReductionMin: number = shutterSettings.heatReductionMaxCloudiness;
    if (cloudiness <= fullReductionMax || noReductionMin <= fullReductionMax) {
      return 1;
    }
    if (cloudiness >= noReductionMin) {
      return 0;
    }
    return 1 - (cloudiness - fullReductionMax) / (noReductionMin - fullReductionMax);
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
    // HTTPSOptions logs the path it is constructed with, so it is constructed with a redacted one and the
    // real query - which carries key and location - is set afterwards. The repository is public and an
    // operator runs at Debug, which is the level that log line goes out on.
    // Do NOT collapse these two into one constructor call: that puts the key into a log line. The guard is
    // "carries key and location in the request and in no log line" in test/services/weather-service.test.ts.
    const options: HTTPSOptions = new HTTPSOptions(host, '/data/3.0/onecall (forecast)', {}, 'GET', 443);
    options.path =
      `/data/3.0/onecall?lat=${WeatherService.latitude}&lon=${WeatherService.longitude}` +
      `&appid=${WeatherService.appID}&units=metric&lang=de`;
    ServerLogService.writeLog(LogLevel.Debug, 'Send WeatherAPi Request for data update.');
    HTTPSService.request(options, '', 5, (response: string, statusCode: number) => {
      if (statusCode < 200 || statusCode >= 300) {
        // Everything outside the successful range ends the update here, and the last forecast stays in place:
        // an old forecast is a worse answer than a fresh one, an error page is none at all.
        // This covers both ways a request can miss its forecast. `HTTPSService.failureStatusCode` means there
        // was no answer to begin with, and any other code means the endpoint answered something that is not
        // one - a refused key answers 401, an exhausted quota 429. The body cannot be what decides that:
        // those answers are readable JSON as well, so parsing them succeeds and yields a WeatherResponse
        // whose every field is undefined.
        // Only the code is named: the request carries the key and the answer mirrors the coordinate back.
        ServerLogService.writeLog(LogLevel.Warn, `WeatherAPi request answered ${statusCode} --> no forecast update`);
        return;
      }
      ServerLogService.writeLog(LogLevel.Debug, 'WeatherAPi Response erhalten');
      // The length rather than the body: the answer mirrors the coordinate of the request back, so a raw
      // dump writes the location of the plant into the log even though it carries no key itself.
      ServerLogService.writeLog(LogLevel.DeepTrace, `WeatherAPi Response of ${response.length} characters received`);
      Utils.guardedFunction(
        () => {
          const responseObj: WeatherResponse = JSON.parse(response);
          WeatherService.processHourlyWeather(responseObj);
          for (const dataUpdateCbsKey in this._dataUpdateCbs) {
            this._dataUpdateCbs[dataUpdateCbsKey]();
          }
        },
        this,
        // Neither the request nor the answer is named here: the first carries the key, the second mirrors
        // the location back. The status of the call is already reported by the two lines above.
        'WeatherService: the answer of the weather API could not be processed',
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
