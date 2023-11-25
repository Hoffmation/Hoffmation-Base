import { iActuator, iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import { LogLevel, TimeOfDay } from '../../../models';

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

  public static checkUnBlock(device: iActuator, force: boolean | undefined, pValue: boolean): boolean {
    let dontBlock: boolean = false;
    if (
      force &&
      device.settings.resetToAutomaticOnForceOffAfterForceOn &&
      !pValue &&
      device.blockAutomationHandler.automaticBlockActive
    ) {
      dontBlock = true;
      device.log(LogLevel.Debug, `Reset Automatic Block as we are turning off manually after a force on`);
      device.blockAutomationHandler.liftAutomaticBlock();
    }
    return dontBlock;
  }

  public static toggleLight(
    device: iLamp,
    time: TimeOfDay | undefined,
    force: boolean,
    calculateTime: boolean,
  ): boolean {
    const newVal: boolean = device.queuedValue !== null ? !device.queuedValue : !device.lightOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    if (newVal && time === undefined && calculateTime && device.room !== undefined) {
      time = TimeCallbackService.dayType(device.room?.settings.lampOffset);
    }
    if (newVal && time !== undefined) {
      device.setTimeBased(time, timeout, force);
      return true;
    }
    device.setLight(newVal, timeout, force);
    return newVal;
  }

  public static checkBlockActive(device: iActuator, force: boolean | undefined, pValue: boolean): boolean {
    if (!force && device.blockAutomationHandler.automaticBlockActive) {
      device.log(
        LogLevel.Debug,
        `Skip automatic command to ${pValue} as it is locked until ${new Date(
          device.blockAutomationHandler.automaticBlockedUntil,
        ).toLocaleTimeString()}`,
      );
      device.targetAutomaticState = pValue;
      return true;
    }
    return false;
  }

  public static checkUnchanged(device: iActuator, force: boolean, pValue: boolean): boolean {
    if (!force && pValue === device.actuatorOn && device.queuedValue === null) {
      device.log(
        LogLevel.DeepTrace,
        `Skip light command as it is already ${pValue}`,
        LogDebugType.SkipUnchangedActuatorCommand,
      );
      return true;
    }
    return false;
  }
}
