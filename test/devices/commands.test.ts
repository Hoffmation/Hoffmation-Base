import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  CommandSource,
  LampSetLightCommand,
  PresenceGroupAnyMovementAction,
  PresenceGroupLastLeftAction,
  RoomSetLightTimeBasedCommand,
  Utils,
} from '../../src';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew

describe('Commands', () => {
  it('Should print a proper reason Tree', () => {
    const c1 = new LampSetLightCommand(CommandSource.Force, false, 'Testreason Lamp');
    const c2 = new ActuatorSetStateCommand(c1, true, 'Testreason Actuator');

    const result = c2.logMessage;
    expect(result).toBe(
      'Actuator setState to true with disableCommand undefined for reason: CommandSource("Force") stack => LampSetLightCommand("Testreason Lamp") -> ActuatorSetStateCommand("Testreason Actuator")',
    );
  });
  it('Action should print a proper reason Tree', () => {
    const a1 = new PresenceGroupLastLeftAction(CommandSource.Automatic, 'Testreason');
    const c1 = new LampSetLightCommand(a1, false, 'Testreason Lamp');
    const c2 = new ActuatorSetStateCommand(c1, true, 'Testreason Actuator');
    const c3 = new ActuatorWriteStateToDeviceCommand(c2, true);

    const result = c3.logMessage;
    expect(result).toBe(
      'Actuator Write StateToDevice original Log-message: Actuator setState to true with disableCommand undefined for reason: CommandSource("Automatic") stack => PresenceGroupLastLeftAction("Testreason") -> LampSetLightCommand("Testreason Lamp") -> ActuatorSetStateCommand("Testreason Actuator")',
    );
  });
  it('Action should be JSON exportable', () => {
    const a1 = new PresenceGroupAnyMovementAction(CommandSource.Automatic, 'Testreason');
    const c1 = new RoomSetLightTimeBasedCommand(a1, false, 'Testreason Lamp');
    const c2 = new ActuatorSetStateCommand(c1, false, 'No one is present --> Turn off lights.');
    const c3 = new ActuatorWriteStateToDeviceCommand(c2, true);

    const jsonMessage = JSON.parse(JSON.stringify(Utils.jsonFilter(c3))).logMessage;
    expect(jsonMessage).toBe(c3.logMessage);
  });
});
