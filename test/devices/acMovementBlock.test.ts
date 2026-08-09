import {
  BlockAutomaticCommand,
  BlockAutomaticHandler,
  CommandSource,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
  Utils,
} from '../../src';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew
jest.mock('unifi-access', () => jest.fn()); // Working now, phew

// guardedTimeout - which is how the handler schedules the revert - needs the services standing.
Utils.testInitializeServices();

/**
 * The block an AC sets on movement while noCoolingOnMovement is on.
 *
 * The pieces under test are the ones the behaviour actually rests on: a short block renewed by every
 * movement keeps the unit off while somebody is in the room, and lifting it is what turns the unit
 * back on shortly after they leave - rather than waiting for the next five-minute automatic check.
 *
 * Durations here are milliseconds, not the real minutes: what is asserted is the collision and
 * revert behaviour, and both are independent of how long the block lasts.
 */
const MOVEMENT_BLOCK_MS = 120;
/** What a long press on the wall button sets - deliberately far longer than a movement block. */
const MANUAL_BLOCK_MS = 60 * 60 * 1000;

interface Harness {
  handler: BlockAutomaticHandler;
  restores: RestoreTargetAutomaticValueCommand[];
}

/**
 * A block handler with the restore callback recorded instead of applied.
 * @returns The handler plus the restore commands it has fired so far.
 */
function harness(): Harness {
  const restores: RestoreTargetAutomaticValueCommand[] = [];
  const handler = new BlockAutomaticHandler(
    (c) => {
      restores.push(c);
    },
    (_level: LogLevel, _message: string) => {
      // The handler logs every decision; none of it is what this test is about.
    },
  );
  return { handler, restores };
}

/**
 * The command the movement path builds: short, and it reverts to automatic when it expires.
 * @returns A movement block with the test duration.
 */
function movementBlock(): BlockAutomaticCommand {
  return new BlockAutomaticCommand(CommandSource.Automatic, MOVEMENT_BLOCK_MS, 'noCoolingOnMovement', undefined, true);
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('AC movement block', () => {
  it('blocks the automatic while somebody keeps moving', () => {
    const { handler } = harness();

    handler.disableAutomatic(movementBlock());

    expect(handler.automaticBlockActive).toBe(true);
  });

  it('is pushed further out by every new movement', async () => {
    const { handler } = harness();

    handler.disableAutomatic(movementBlock());
    const firstEnd = handler.automaticBlockedUntil.getTime();
    await wait(30);
    handler.disableAutomatic(movementBlock());

    // Renewed, not ignored - otherwise the unit would come back on with somebody still in the room.
    expect(handler.automaticBlockedUntil.getTime()).toBeGreaterThan(firstEnd);
  });

  it('turns the automatic back on shortly after the last movement', async () => {
    const { handler, restores } = harness();

    handler.disableAutomatic(movementBlock());
    expect(restores).toHaveLength(0);

    // The handler schedules the revert 500ms after the block ends, so the wait has to clear both.
    await wait(MOVEMENT_BLOCK_MS + 500 + 250);

    // This is what makes the room cool again after it empties, without waiting for the next
    // five-minute automatic check.
    expect(restores).toHaveLength(1);
    expect(handler.automaticBlockActive).toBe(false);
  });

  it('never shortens a longer manual block', () => {
    const { handler } = harness();
    handler.disableAutomatic(new BlockAutomaticCommand(CommandSource.Force, MANUAL_BLOCK_MS, 'HeatGroup setAc'));
    const manualEnd = handler.automaticBlockedUntil.getTime();

    handler.disableAutomatic(movementBlock());

    // Someone switched the unit off by hand; walking past it must not undo that decision.
    expect(handler.automaticBlockedUntil.getTime()).toBe(manualEnd);
  });
});
