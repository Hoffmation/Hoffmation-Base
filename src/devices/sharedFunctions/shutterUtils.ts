import { ShutterSetLevelCommand } from '../../command';
import { iShutter } from '../../interfaces';
import { LogDebugType, LogLevel, WindowPosition } from '../../enums';

export class ShutterUtils {
  /**
   * Handles setting the shutter level with all checks (block automation, window open, etc)
   * @param device - The shutter
   * @param c - The command
   */
  public static setLevel(device: iShutter, c: ShutterSetLevelCommand): void {
    // Respect block automation
    if (!c.isForceAction && device.blockAutomationHandler.automaticBlockActive) {
      device.logCommand(
        c,
        `Skip shutter command to Position ${c.level} as automation is blocked until ${new Date(
          device.blockAutomationHandler.automaticBlockedUntil,
        ).toLocaleTimeString('de-DE')}`,
      );
      // Set the target automatic value
      device.targetAutomaticValue = c.level;
      return;
    }
    let pPosition: number = c.level;
    if (!device.firstCommandRecieved && !c.isInitial) {
      device.firstCommandRecieved = true;
    } else if (device.firstCommandRecieved && c.isInitial) {
      device.logCommand(c, `Skipped initial shutter to ${pPosition} as we recieved a command already`);
      return;
    }
    if (device.currentLevel === pPosition && !c.isForceAction) {
      device.logCommand(
        c,
        `Skip shutter command to Position ${pPosition} as this is the current one`,
        LogDebugType.SkipUnchangedRolloPosition,
      );
      return;
    }
    device.logCommand(c);

    if (device.window !== undefined) {
      if (device.window.griffeInPosition(WindowPosition.open) > 0 && pPosition < 100) {
        if (!c.skipOpenWarning) {
          device.log(LogLevel.Alert, 'Not closing the shutter, as the window is open!');
        }
        return;
      }
      if (device.window.griffeInPosition(WindowPosition.tilted) > 0 && pPosition < 50) {
        pPosition = 50;
        if (!c.skipOpenWarning) {
          device.log(LogLevel.Alert, 'Not closing the shutter, as the window is half open!');
        }
      }
    }

    // Set the level and move
    device.log(LogLevel.Debug, `Move  to position ${pPosition}`);
    device.writePositionStateToDevice(pPosition);
  }
}
