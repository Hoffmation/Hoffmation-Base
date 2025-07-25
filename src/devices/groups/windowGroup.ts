import {
  RoomRestoreShutterPositionCommand,
  RoomSetLightTimeBasedCommand,
  ShutterSetLevelCommand,
  ShutterSunriseUpCommand,
  ShutterSunsetDownCommand,
  WindowRestoreDesiredPositionCommand,
  WindowSetDesiredPositionCommand,
  WindowSetRolloByWeatherStatusCommand,
} from '../../command';
import { TimeCallbackService, WeatherService } from '../../services';
import {
  CommandSource,
  DeviceClusterType,
  GroupType,
  LogLevel,
  TimeCallbackType,
  TimeOfDay,
  WindowPosition,
} from '../../enums';
import { DeviceList } from '../device-list';
import { Utils } from '../../utils';
import { ShutterSettings } from '../../settingsObjects';
import { iRoomBase, iShutter, iWindow, iWindowGroup } from '../../interfaces';
import { TimeCallback } from '../../models';
import { HandleChangeAction } from '../../action';
import { BaseGroup } from './base-group';

export class WindowGroup extends BaseGroup implements iWindowGroup {
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
    public windows: iWindow[],
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

  /**
   * Checks if any Shutter of any window is down
   * @returns {boolean} True if there is atleast one shutte with level of 0%.
   */
  public get anyShutterDown(): boolean {
    return this.windows.some((w: iWindow) => {
      return w.anyShutterDown;
    });
  }

  /**
   * Checks if any handle of any window is open
   * @returns {boolean} True if there is atleast one handle that is open.
   */
  public get anyWindowOpen(): boolean {
    return this.windows.some((w: iWindow) => {
      return w.anyHandleNotClosed;
    });
  }

  /**
   * Adds Callbacks to each window and their handles.
   * @param cb - The callback to execute on met condition.
   */
  public addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void {
    this.windows.forEach((f: iWindow): void => {
      f.addHandleChangeCallback(cb);
    });
  }

  public setDesiredPosition(c: WindowSetDesiredPositionCommand): void {
    this.windows.forEach((f) => {
      f.setDesiredPosition(c);
    });
  }

  public initialize(): void {
    const room: iRoomBase = this.getRoom();
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
    const room: iRoomBase = this.getRoom();
    const timeOfDay: TimeOfDay = TimeCallbackService.dayType(room.settings.rolloOffset);
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(timeOfDay);
    this.windows.forEach((f) => {
      const shutterSettings: ShutterSettings | undefined = f.getShutter()?.settings;
      if (!shutterSettings) {
        return;
      }
      const shutter: iShutter | undefined = f.getShutter();
      if (!shutter || shutter.blockAutomationHandler.automaticBlockActive) {
        return;
      }
      if (darkOutside) {
        f.restoreDesiredPosition(new WindowRestoreDesiredPositionCommand(c, "It's dark outside."));
        return;
      }
      if (f.griffeInPosition(WindowPosition.open) > 0 || f.griffeInPosition(WindowPosition.tilted) > 0) {
        return;
      }
      let desiredPos: number = f.desiredPosition;
      if (desiredPos > 0) {
        desiredPos = WeatherService.weatherRolloPosition(
          f.getShutter()?.baseAutomaticLevel ?? 0,
          room.HeatGroup?.desiredTemp ?? -99,
          room.HeatGroup?.temperature ?? -99,
          this.log.bind(this),
          shutterSettings,
        );
      }
      f.getShutter()?.setLevel(new ShutterSetLevelCommand(c, desiredPos, '', true));
    });
  }

  public sunriseUp(c: ShutterSunriseUpCommand): void {
    this.setWindowShutterBaseAutomaticLevel(100);
    this.windows.forEach((w) => {
      if (!this.getRoom().settings.sonnenAufgangRollos || w.getShutter() === undefined) {
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

  public sunsetDown(c: ShutterSunsetDownCommand): void {
    this.windows.forEach((w) => {
      const shutter: iShutter | undefined = w.getShutter();
      if (!shutter) {
        return;
      }
      shutter.baseAutomaticLevel = 0;
      w.setDesiredPosition(new WindowSetDesiredPositionCommand(c, 0));
    });
    const room: iRoomBase = this.getRoom();
    room.setLightTimeBased(new RoomSetLightTimeBasedCommand(c, true, 'sunsetDown'));
  }

  public reconfigureSunsetShutterCallback(): void {
    const room: iRoomBase = this.getRoom();
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
            this.setWindowShutterBaseAutomaticLevel(0);
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

  private setWindowShutterBaseAutomaticLevel(level: number): void {
    this.windows.forEach((f) => {
      const shutter: iShutter | undefined = f.getShutter();
      if (!shutter) {
        return;
      }
      shutter.baseAutomaticLevel = level;
    });
  }

  public reconfigureSunriseShutterCallback(): void {
    const room: iRoomBase = this.getRoom();
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
        if (!this.anyShutterDown) {
          // Only set new desired position without applying it.
          this.setDesiredPosition(
            new WindowSetDesiredPositionCommand(CommandSource.Initial, 100, 'It is daytime during restart.', false),
          );
        } else {
          this.sunriseUp(
            new ShutterSunriseUpCommand(
              CommandSource.Initial,
              'Initial sunrise up as it is day and at least 1 shutter is down.',
            ),
          );
        }
      }
      TimeCallbackService.addCallback(this.sunriseShutterCallback);
    }
  }
}
