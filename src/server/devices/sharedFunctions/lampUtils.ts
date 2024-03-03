import { iActuator, iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import {
  ActuatorSetStateCommand,
  LampSetLightCommand,
  LampToggleLightCommand,
  LogLevel,
  TimeOfDay,
} from '../../../models';

export class LampUtils {
  public static stromStossOn(lamp: iLamp) {
    Utils.guardedTimeout(
      () => {
        if (lamp.room?.PraesenzGroup?.anyPresent()) {
          lamp.setLight(true, -1, true);
        }
      },
      lamp.settings.stromStossResendTime * 1000,
      this,
    );
    Utils.guardedTimeout(
      () => {
        lamp.setLight(false, -1, true);
      },
      3000,
      this,
    );
  }

  public static setTimeBased(device: iLamp, time: TimeOfDay, timeout: number, force: boolean): void {
    if (
      (time === TimeOfDay.Night && device.settings.nightOn) ||
      (time === TimeOfDay.BeforeSunrise && device.settings.dawnOn) ||
      (time === TimeOfDay.AfterSunset && device.settings.duskOn)
    ) {
      device.setLight(true, timeout, force);
    }
  }

  public static checkUnBlock(device: iActuator, command: ActuatorSetStateCommand): boolean {
    let dontBlock: boolean = false;
    if (
      command.force &&
      device.settings.resetToAutomaticOnForceOffAfterForceOn &&
      !command.on &&
      device.blockAutomationHandler.automaticBlockActive
    ) {
      dontBlock = true;
      device.log(LogLevel.Debug, `Reset Automatic Block as we are turning off manually after a force on`);
      device.blockAutomationHandler.liftAutomaticBlock();
    }
    return dontBlock;
  }

  public static toggleLight(device: iLamp, c: LampToggleLightCommand): boolean {
    const newVal: boolean = device.queuedValue !== null ? !device.queuedValue : !device.lightOn;
    const timeout: number = newVal && c.force ? 30 * 60 * 1000 : -1;
    if (newVal && c.time === undefined && c.calculateTime && device.room !== undefined) {
      c.time = TimeCallbackService.dayType(device.room?.settings.lampOffset);
    }
    if (newVal && c.time !== undefined) {
      device.setTimeBased(c.time, timeout, c.force);
      return true;
    }
    device.setLight(new LampSetLightCommand(c.source, newVal, 'SetLight Due to toggle Light', timeout, c.force));
    return newVal;
  }

  public static checkBlockActive(device: iActuator, c: ActuatorSetStateCommand): boolean {
    if (!c.force && device.blockAutomationHandler.automaticBlockActive) {
      device.log(
        LogLevel.Debug,
        `Skip automatic command to ${c.on} as it is locked until ${new Date(
          device.blockAutomationHandler.automaticBlockedUntil,
        ).toLocaleTimeString()}`,
      );
      device.targetAutomaticState = c.on;
      return true;
    }
    return false;
  }

  public static checkUnchanged(device: iActuator, c: ActuatorSetStateCommand): boolean {
    if (!c.force && c.on === device.actuatorOn && device.queuedValue === null) {
      device.log(
        LogLevel.DeepTrace,
        `Skip light command as it is already ${c.on}`,
        LogDebugType.SkipUnchangedActuatorCommand,
      );
      return true;
    }
    return false;
  }
}
