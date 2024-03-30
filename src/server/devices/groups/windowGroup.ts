import {
  CommandSource,
  LogLevel,
  RoomBase,
  RoomRestoreShutterPositionCommand,
  RoomSetLightTimeBasedCommand,
  ShutterSetLevelCommand,
  ShutterSettings,
  ShutterSunriseUpCommand,
  ShutterSunsetDownCommand,
  TimeCallback,
  TimeCallbackType,
  TimeOfDay,
  WindowRestoreDesiredPositionCommand,
  WindowSetDesiredPositionCommand,
  WindowSetRolloByWeatherStatusCommand,
} from '../../../models';
import { ShutterService, TimeCallbackService, Utils, WeatherService } from '../../services';
import { Window } from './Window';
import { WindowPosition } from '../models';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { DeviceClusterType } from '../device-cluster-type';

export class WindowGroup extends BaseGroup {
  /**
   * Timecallback for sunrise-shutter actions
   * @remarks This callback is only set if needed and already calculated.
   * @warning Manual setting of this callback is not recommended. Prefer {@link recalcTimeCallbacks} after changing settings.
   */
  public sunriseShutterCallback: TimeCallback | undefined;
  /**
   * Timecallback for sunset-shutter actions
   * @remarks This callback is only set if needed and already calculated.
   * @warning Manual setting of this callback is not recommended. Prefer {@link recalcTimeCallbacks} after changing settings.
   */
  public sunsetShutterCallback: TimeCallback | undefined;

  public constructor(
    roomName: string,
    public windows: Window[],
  ) {
    super(roomName, GroupType.WindowGroup);
    const shutterIds: string[] = [];
    const handleIds: string[] = [];
    const vibrationIds: string[] = [];
    const magnetIds: string[] = [];
    windows.forEach((window) => {
      shutterIds.push(...window.shutterIds);
      handleIds.push(...window.handleIds);
      vibrationIds.push(...window.vibrationIds);
      magnetIds.push(...window.magnetIds);
    });
    this.deviceCluster.deviceMap.set(DeviceClusterType.Handle, new DeviceList(handleIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Vibration, new DeviceList(vibrationIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Shutter, new DeviceList(shutterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.MagnetContact, new DeviceList(magnetIds));
  }

  public setDesiredPosition(c: WindowSetDesiredPositionCommand): void {
    this.windows.forEach((f) => {
      f.setDesiredPosition(c);
    });
  }

  public initialize(): void {
    const room: RoomBase = this.getRoom();
    this.recalcTimeCallbacks();

    if (room.settings.rolloHeatReduction) {
      Utils.guardedInterval(
        () => {
          this.setRolloByWeatherStatus(
            new WindowSetRolloByWeatherStatusCommand(CommandSource.Automatic, 'Regular interval'),
          );
        },
        15 * 60 * 1000,
        this,
        false,
      );
      Utils.guardedTimeout(
        () => {
          this.setRolloByWeatherStatus(
            new WindowSetRolloByWeatherStatusCommand(CommandSource.Automatic, 'Delayed initial check'),
          );
        },
        2 * 60 * 1000,
        this,
      );
    }

    this.windows.forEach((f) => {
      f.initialize();
    });
  }

  public recalcTimeCallbacks(): void {
    this.reconfigureSunriseShutterCallback();
    this.reconfigureSunsetShutterCallback();
  }

  public setRolloByWeatherStatus(c: WindowSetRolloByWeatherStatusCommand): void {
    const room: RoomBase = this.getRoom();
    const timeOfDay: TimeOfDay = TimeCallbackService.dayType(room.settings.rolloOffset);
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(timeOfDay);
    this.windows.forEach((f) => {
      const shutterSettings: ShutterSettings | undefined = f.getShutter()?.[0]?.settings;
      if (!shutterSettings) {
        return;
      }
      if (darkOutside) {
        f.restoreDesiredPosition(new WindowRestoreDesiredPositionCommand(c, "It's dark outside."));
        return;
      }
      let desiredPos: number = f.desiredPosition;
      if (desiredPos > 0) {
        desiredPos = WeatherService.weatherRolloPosition(
          desiredPos,
          room.HeatGroup?.desiredTemp ?? -99,
          room.HeatGroup?.temperature ?? -99,
          this.log.bind(this),
          shutterSettings,
        );
      }
      if (f.griffeInPosition(WindowPosition.offen) > 0 && desiredPos < 100) {
        return;
      }
      if (f.griffeInPosition(WindowPosition.kipp) > 0) {
        desiredPos = Math.max(30, desiredPos);
      }
      ShutterService.windowAllToPosition(f, new ShutterSetLevelCommand(c, desiredPos, '', true));
    });
  }

  public sunriseUp(c: ShutterSunriseUpCommand): void {
    this.windows.forEach((w) => {
      if (!this.getRoom().settings.sonnenAufgangRollos || w.getShutter().length === 0) {
        return;
      }
      w.setDesiredPosition(new WindowSetDesiredPositionCommand(c, 100));
    });
  }

  public restoreShutterPosition(c: RoomRestoreShutterPositionCommand): void {
    if (!c.recalc) {
      this.windows.forEach((f) => {
        f.restoreDesiredPosition(new WindowRestoreDesiredPositionCommand(c));
      });
      return;
    }
    if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(this.getRoom().settings.rolloOffset))) {
      this.sunriseUp(new ShutterSunriseUpCommand(c, 'It is daytime'));
    } else {
      this.sunsetDown(new ShutterSunsetDownCommand(c, 'It is dark outside or nighttime'));
    }
  }

  public changeVibrationMotionBlock(block: boolean): void {
    this.windows.forEach((f) => {
      if (f.getVibration().length === 0) {
        return;
      }
      f.getVibration().forEach((v) => {
        v.vibrationBlockedByMotion = block;
      });
    });
  }

  private sunsetDown(c: ShutterSunsetDownCommand): void {
    this.setDesiredPosition(new WindowSetDesiredPositionCommand(c, 0));
    const room: RoomBase = this.getRoom();
    room.setLightTimeBased(new RoomSetLightTimeBasedCommand(c, true, 'sunsetDown'));
  }

  private reconfigureSunsetShutterCallback(): void {
    const room: RoomBase = this.getRoom();
    if (!room.settings.sonnenUntergangRollos || !room.settings.rolloOffset) {
      if (this.sunsetShutterCallback !== undefined) {
        this.log(LogLevel.Debug, `Remove Sunset Shutter callback for ${this.roomName}`);
        TimeCallbackService.removeCallback(this.sunsetShutterCallback);
        this.sunsetShutterCallback = undefined;
      }
      return;
    }
    if (this.sunsetShutterCallback && room.settings.rolloOffset) {
      this.sunsetShutterCallback.minuteOffset = room.settings.rolloOffset.sunset;
      this.sunsetShutterCallback.sunTimeOffset = room.settings.rolloOffset;
      if (room.settings.sonnenUntergangRolloAdditionalOffsetPerCloudiness > 0) {
        this.sunsetShutterCallback.cloudOffset =
          WeatherService.getCurrentCloudiness() * room.settings.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
      }
      this.sunsetShutterCallback.recalcNextToDo(new Date());
    }
    if (this.sunsetShutterCallback === undefined) {
      this.log(LogLevel.Debug, `Add Sunset Shutter callback for ${this.roomName}`);
      this.sunsetShutterCallback = new TimeCallback(
        `${this.roomName} Sunset Shutter`,
        TimeCallbackType.SunSet,
        () => {
          this.sunsetDown(new ShutterSunsetDownCommand(CommandSource.Automatic, 'Time-Callback fired'));
        },
        room.settings.rolloOffset.sunset,
      );
      if (TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(room.settings.rolloOffset))) {
        Utils.guardedTimeout(
          () => {
            this.setDesiredPosition(
              new WindowSetDesiredPositionCommand(CommandSource.Initial, 0, 'It is dark outside'),
            );
          },
          60000,
          this,
        );
      }
      TimeCallbackService.addCallback(this.sunsetShutterCallback);
    }
  }

  private reconfigureSunriseShutterCallback(): void {
    const room: RoomBase = this.getRoom();
    if (!room.settings.sonnenAufgangRollos || !room.settings.rolloOffset) {
      if (this.sunriseShutterCallback !== undefined) {
        this.log(LogLevel.Debug, `Remove Sunrise Shutter callback for ${this.roomName}`);
        TimeCallbackService.removeCallback(this.sunriseShutterCallback);
        this.sunriseShutterCallback = undefined;
      }
      return;
    }
    if (this.sunriseShutterCallback && room.settings.rolloOffset) {
      this.sunriseShutterCallback.minuteOffset = room.settings.rolloOffset.sunrise;
      this.sunriseShutterCallback.sunTimeOffset = room.settings.rolloOffset;
      this.sunriseShutterCallback.recalcNextToDo(new Date());
    }
    if (this.sunriseShutterCallback === undefined) {
      this.log(LogLevel.Debug, `Add Sunrise shutter TimeCallback for ${this.roomName}`);
      this.sunriseShutterCallback = new TimeCallback(
        `${this.roomName} Sunrise Shutter`,
        TimeCallbackType.Sunrise,
        () => {
          if (room.skipNextRolloUp) {
            this.log(LogLevel.Info, `${this.roomName} skipped sunrise up due to room.skipNextRolloUp`);
            room.skipNextRolloUp = false;
            return;
          }
          this.sunriseUp(new ShutterSunriseUpCommand(CommandSource.Automatic, 'Time-Callback fired'));
        },
        room.settings.rolloOffset.sunrise,
        undefined,
        undefined,
        room.settings.rolloOffset,
      );
      if (!TimeCallbackService.darkOutsideOrNight(TimeCallbackService.dayType(room.settings.rolloOffset))) {
        this.sunriseUp(new ShutterSunriseUpCommand(CommandSource.Initial, 'Initial sunrise up as it is day'));
      }
      TimeCallbackService.addCallback(this.sunriseShutterCallback);
    }
  }
}
