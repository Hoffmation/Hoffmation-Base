import { iActuator, iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  CommandSource,
  CommandType,
  DimmerSetLightCommand,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LogLevel,
  TimeOfDay,
} from '../../../models';
import { iDimmableLamp } from '../baseDeviceInterfaces/iDimmableLamp';

export class LampUtils {
  private static stromStossContinueTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  public static stromStossOn(actuator: iActuator) {
    if (!LampUtils.stromStossContinueTimeouts.has(actuator.id)) {
      LampUtils.stromStossContinueTimeouts.set(
        actuator.id,
        Utils.guardedTimeout(
          () => {
            LampUtils.stromStossContinueTimeouts.delete(actuator.id);
            if (actuator.room?.PraesenzGroup?.anyPresent()) {
              actuator.setActuator(
                new ActuatorSetStateCommand(CommandSource.Automatic, true, 'StromStoss On due to Presence', null),
              );
            }
          },
          actuator.settings.stromStossResendTime * 1000,
          this,
        ),
      );
    }
    Utils.guardedTimeout(
      () => {
        actuator.setActuator(new ActuatorSetStateCommand(CommandSource.Force, false, 'StromStoss Off', null));
      },
      3000,
      this,
    );
  }

  public static setTimeBased(device: iLamp, c: LampSetTimeBasedCommand): void {
    if (
      c.isManual ||
      (c.time === TimeOfDay.Daylight && device.settings.dayOn) ||
      (c.time === TimeOfDay.Night && device.settings.nightOn) ||
      (c.time === TimeOfDay.BeforeSunrise && device.settings.dawnOn) ||
      (c.time === TimeOfDay.AfterSunset && device.settings.duskOn)
    ) {
      device.setLight(
        new LampSetLightCommand(c, true, `SetLight due to TimeBased ${TimeOfDay[c.time]}`, c.disableAutomaticCommand),
      );
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
      const liftCommand: BlockAutomaticLiftBlockCommand = new BlockAutomaticLiftBlockCommand(
        command,
        'Reset Automatic Block as we are turning off manually after a force on',
      );
      liftCommand.overrideCommandSource = CommandSource.Automatic;
      device.blockAutomationHandler.liftAutomaticBlock(liftCommand);
    }
    return dontBlock;
  }

  public static toggleLight(device: iLamp, c: LampToggleLightCommand): boolean {
    const newVal: boolean = device.queuedValue !== null ? !device.queuedValue : !device.actuatorOn;

    if (newVal && c.time === undefined && c.calculateTime && device.room !== undefined) {
      c.time = TimeCallbackService.dayType(device.room?.settings.lampOffset);
    }
    if (newVal && c.time !== undefined) {
      device.setTimeBased(new LampSetTimeBasedCommand(c, c.time, '', c.isForceAction ? undefined : null));
      return true;
    }
    device.setLight(new LampSetLightCommand(c, newVal, '', c.isForceAction ? undefined : null));
    return newVal;
  }

  public static checkBlockActive(device: iActuator, c: ActuatorSetStateCommand): boolean {
    if (!c.isForceAction && device.blockAutomationHandler.automaticBlockActive) {
      device.log(
        LogLevel.Debug,
        `Skip command to ${c.on} as it is locked until ${new Date(
          device.blockAutomationHandler.automaticBlockedUntil,
        ).toLocaleTimeString('de-DE')}; command Log: ${c.logMessage}`,
      );
      device.targetAutomaticState = c.on;
      return true;
    }
    return false;
  }

  /**
   * Check if the dimmer is already in the desired state thus allowing to skip this command
   * @param {iDimmableLamp} device - The device to check
   * @param {DimmerSetLightCommand} c - The command to check
   * @returns {boolean} - True if the command can be skipped
   */
  public static canDimmerChangeBeSkipped(device: iDimmableLamp, c: DimmerSetLightCommand): boolean {
    if (c.isForceAction) {
      return false;
    }
    if (!this.canActuatorChangeBeSkipped(device, c, true)) {
      return false;
    }
    if (c.brightness !== device.brightness) {
      return false;
    }

    device.log(
      LogLevel.DeepTrace,
      `Light command can be skipped as the device is already in desired state: ${c.logMessage}`,
      LogDebugType.SkipUnchangedActuatorCommand,
    );
    return true;
  }

  public static canActuatorChangeBeSkipped(
    device: iActuator,
    c: ActuatorSetStateCommand,
    noLog: boolean = false,
  ): boolean {
    if (c.isForceAction) {
      return false;
    }
    if (
      (device.queuedValue === null && device.actuatorOn !== c.on) ||
      (device.queuedValue !== null && c.on === device.queuedValue)
    ) {
      return false;
    }

    if (!noLog) {
      device.log(
        LogLevel.DeepTrace,
        `Light command can be skipped as device is already in desired state; command: ${c.logMessage}`,
        LogDebugType.SkipUnchangedActuatorCommand,
      );
    }
    return true;
  }

  public static setActuator(device: iActuator, c: ActuatorSetStateCommand): void {
    if (
      device.settings.isStromStoss &&
      c.on &&
      c.containsType(CommandType.ActuatorRestoreTargetAutomaticValueCommand)
    ) {
      // Don't restore automatic state on Strommstoss-Relais as this might result in a loop.
      return;
    }
    const dontBlock: boolean = LampUtils.checkUnBlock(device, c);
    if (LampUtils.checkBlockActive(device, c)) {
      return;
    }
    if (c.isAutomaticAction) {
      // Preserve the target state for the automatic handler, as
      device.targetAutomaticState = c.on;
    }
    if (LampUtils.canActuatorChangeBeSkipped(device, c)) {
      return;
    }

    device.queuedValue = c.on;
    device.writeActuatorStateToDevice(new ActuatorWriteStateToDeviceCommand(c, c.on));

    if (device.settings.isStromStoss && c.on) {
      c.disableAutomaticCommand = new BlockAutomaticCommand(c, 3000, 'StromStoss Off');
      LampUtils.stromStossOn(device);
    }
    if (dontBlock || c.disableAutomaticCommand === null) {
      return;
    }
    if (dontBlock) {
      return;
    }
    if (c.disableAutomaticCommand === undefined && c.isForceAction) {
      c.disableAutomaticCommand = BlockAutomaticCommand.fromDeviceSettings(c, device.settings);
    }
    if (c.disableAutomaticCommand) {
      device.blockAutomationHandler.disableAutomatic(c.disableAutomaticCommand);
    }
  }
}
