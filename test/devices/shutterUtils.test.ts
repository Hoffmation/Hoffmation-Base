import { CommandSource, LogLevel, ShutterSetLevelCommand, ShutterUtils, WindowPosition } from '../../src';
import { iShutter } from '../../src/interfaces';

jest.mock('unifi-access', () => jest.fn()); // Working now, phew

interface LogCall {
  level: LogLevel;
  message: string;
}

interface ShutterStub {
  device: iShutter;
  logs: LogCall[];
  written: number[];
}

/**
 * The smallest shutter that reaches the window check in setLevel.
 *
 * Deliberately hand-built rather than a real device: the branch under test is two lines deep in a
 * method whose earlier guards (block handler, initial command, unchanged position) would each need
 * a whole device tree to satisfy.
 * @param griffePosition - The window position the handles report
 * @param currentLevel - Where the shutter stands before the command
 * @returns The stub device plus the log calls and positions it recorded
 */
function shutterStub(griffePosition: WindowPosition, currentLevel: number = 100): ShutterStub {
  const logs: LogCall[] = [];
  const written: number[] = [];
  const device = {
    currentLevel,
    firstCommandRecieved: true,
    targetAutomaticValue: currentLevel,
    baseAutomaticLevel: currentLevel,
    lastAutomaticDownTime: 0,
    blockAutomationHandler: { automaticBlockActive: false },
    // Nothing to block: the test is about what gets logged, not about the block handler.
    settings: { buildBlockAutomaticCommand: () => null },
    room: undefined,
    window: {
      griffeInPosition: (position: WindowPosition): number => (position === griffePosition ? 1 : 0),
    },
    log: (level: LogLevel, message: string): void => {
      logs.push({ level, message });
    },
    logCommand: (): void => {
      // The command log is not what this test is about.
    },
    writePositionStateToDevice: (position: number): void => {
      written.push(position);
    },
  } as unknown as iShutter;
  return { device, logs, written };
}

function alerts(logs: LogCall[]): LogCall[] {
  return logs.filter((l) => l.level === LogLevel.Alert);
}

describe('ShutterUtils.setLevel window warning', () => {
  it('alerts on a manual command that cannot close a fully open window', () => {
    const stub = shutterStub(WindowPosition.open);

    ShutterUtils.setLevel(stub.device, new ShutterSetLevelCommand(CommandSource.Manual, 0));

    expect(alerts(stub.logs).map((l) => l.message)).toEqual(['Not closing the shutter, as the window is open!']);
    expect(stub.written).toEqual([]);
  });

  it('stays silent on an automatic command that cannot close a fully open window', () => {
    const stub = shutterStub(WindowPosition.open);

    ShutterUtils.setLevel(stub.device, new ShutterSetLevelCommand(CommandSource.Automatic, 0));

    expect(alerts(stub.logs)).toEqual([]);
    // The skip still has to be reconstructable afterwards - quieter, not invisible.
    expect(stub.logs.some((l) => l.message === 'Not closing the shutter, as the window is open!')).toBe(true);
    expect(stub.written).toEqual([]);
  });

  it('alerts on a manual command that can only half close a tilted window', () => {
    const stub = shutterStub(WindowPosition.tilted);

    ShutterUtils.setLevel(stub.device, new ShutterSetLevelCommand(CommandSource.Manual, 0));

    expect(alerts(stub.logs).map((l) => l.message)).toEqual(['Not closing the shutter, as the window is half open!']);
    expect(stub.written).toEqual([50]);
  });

  it('stays silent on an automatic command that can only half close a tilted window', () => {
    const stub = shutterStub(WindowPosition.tilted);

    ShutterUtils.setLevel(stub.device, new ShutterSetLevelCommand(CommandSource.Automatic, 0));

    expect(alerts(stub.logs)).toEqual([]);
    expect(stub.logs.some((l) => l.message === 'Not closing the shutter, as the window is half open!')).toBe(true);
    // The clamp itself is unchanged: an automatic command still stops at half.
    expect(stub.written).toEqual([50]);
  });

  it('stays silent for both sources when the command asks to skip the warning', () => {
    const manual = shutterStub(WindowPosition.tilted);
    const automatic = shutterStub(WindowPosition.tilted);

    ShutterUtils.setLevel(manual.device, new ShutterSetLevelCommand(CommandSource.Manual, 0, '', true));
    ShutterUtils.setLevel(automatic.device, new ShutterSetLevelCommand(CommandSource.Automatic, 0, '', true));

    expect(manual.logs.some((l) => l.message.startsWith('Not closing the shutter'))).toBe(false);
    expect(automatic.logs.some((l) => l.message.startsWith('Not closing the shutter'))).toBe(false);
  });
});
