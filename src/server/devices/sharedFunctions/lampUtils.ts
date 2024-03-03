import { iActuator, iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import {
  ActuatorSetStateCommand,
  CommandSource,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LogLevel,
  TimeOfDay,
} from '../../../models';

export class LampUtils {
  public static stromStossOn(lamp: iLamp) {
    Utils.guardedTimeout(
      () => {
        if (lamp.room?.PraesenzGroup?.anyPresent()) {
          lamp.setLight(new LampSetLightCommand(CommandSource.Force, true, 'StromStoss On due to Presence'));
        }
      },
      lamp.settings.stromStossResendTime * 1000,
      this,
    );
    Utils.guardedTimeout(
      () => {
        lamp.setLight(new LampSetLightCommand(CommandSource.Force, false, 'StromStoss Off'));
      },
      3000,
      this,
    );
  }

  public static setTimeBased(device: iLamp, c: LampSetTimeBasedCommand): void {
    if (
      (c.time === TimeOfDay.Night && device.settings.nightOn) ||
      (c.time === TimeOfDay.BeforeSunrise && device.settings.dawnOn) ||
      (c.time === TimeOfDay.AfterSunset && device.settings.duskOn)
    ) {
      device.setLight(new LampSetLightCommand(c, true, `SetLight due to TimeBased ${c.time}`, c.timeout));
    }
  }

  public static checkUnBlock(device: iActuator, command: ActuatorSetStateCommand): boolean {
    let dontBlock: boolean = false;
    if (
      command.isForceAction &&
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
    const timeout: number = newVal && c.isForceAction ? 30 * 60 * 1000 : -1;
    if (newVal && c.time === undefined && c.calculateTime && device.room !== undefined) {
      c.time = TimeCallbackService.dayType(device.room?.settings.lampOffset);
    }
    if (newVal && c.time !== undefined) {
      device.setTimeBased(new LampSetTimeBasedCommand(c, c.time, 'SetLight Due to toggle Light', timeout));
      return true;
    }
    device.setLight(new LampSetLightCommand(c, newVal, 'SetLight Due to toggle Light', timeout));
    return newVal;
  }

  public static checkBlockActive(device: iActuator, c: ActuatorSetStateCommand): boolean {
    if (!c.isForceAction && device.blockAutomationHandler.automaticBlockActive) {
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
    if (!c.isForceAction && c.on === device.actuatorOn && device.queuedValue === null) {
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
