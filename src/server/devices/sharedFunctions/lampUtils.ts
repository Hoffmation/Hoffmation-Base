import { iActuator, iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  CollisionSolving,
  CommandSource,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LogLevel,
  TimeOfDay,
} from '../../../models';

export class LampUtils {
  public static stromStossOn(actuator: iActuator) {
    Utils.guardedTimeout(
      () => {
        if (actuator.room?.PraesenzGroup?.anyPresent()) {
          actuator.setActuator(new ActuatorSetStateCommand(CommandSource.Force, true, 'StromStoss On due to Presence'));
        }
      },
      actuator.settings.stromStossResendTime * 1000,
      this,
    );
    Utils.guardedTimeout(
      () => {
        actuator.setActuator(new ActuatorSetStateCommand(CommandSource.Force, false, 'StromStoss Off'));
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

  public static setActuator(device: iActuator, c: ActuatorSetStateCommand): void {
    const dontBlock: boolean = LampUtils.checkUnBlock(device, c);
    if (LampUtils.checkBlockActive(device, c)) {
      return;
    }
    if (LampUtils.checkUnchanged(device, c)) {
      return;
    }

    device.queuedValue = c.on;
    device.writeActuatorStateToDevice(new ActuatorWriteStateToDeviceCommand(c, c.on));

    if (device.settings.isStromStoss && c.on) {
      c.timeout = 3000;
      LampUtils.stromStossOn(device);
    }
    if (c.timeout > -1 && !dontBlock) {
      device.blockAutomationHandler.disableAutomatic(c.timeout, CollisionSolving.overrideIfGreater);
    }
  }
}
