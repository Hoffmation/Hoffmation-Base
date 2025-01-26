import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  CommandSource,
  LampSetLightCommand,
  PresenceGroupLastLeftAction,
} from '../../src';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew

describe('Commands', () => {
  it('Should print a proper reason Tree', () => {
    const c1 = new LampSetLightCommand(CommandSource.Force, false, 'Testreason Lamp');
    const c2 = new ActuatorSetStateCommand(c1, true, 'Testreason Actuator');

    const result = c2.logMessage;
    expect(result).toBe(
      'Actuator setState to true with disableCommand undefined for reason: CommandType("Force") stack => LampSetLightCommand("Testreason Lamp") -> ActuatorSetStateCommand("Testreason Actuator")',
    );
  });
  it('Action should print a proper reason Tree', () => {
    const a1 = new PresenceGroupLastLeftAction(CommandSource.Automatic, 'Testreason');
    const c1 = new LampSetLightCommand(a1, false, 'Testreason Lamp');
    const c2 = new ActuatorSetStateCommand(c1, true, 'Testreason Actuator');
    const c3 = new ActuatorWriteStateToDeviceCommand(c2, true);

    const result = c3.logMessage;
    expect(result).toBe(
      'Actuator Write StateToDevice original Log-message: Actuator setState to true with disableCommand undefined for reason: CommandType("Automatic") stack => PresenceGroupLastLeftAction("Testreason") -> LampSetLightCommand("Testreason Lamp") -> ActuatorSetStateCommand("Testreason Actuator")',
    );
  });
});
