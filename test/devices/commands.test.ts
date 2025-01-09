import { ActuatorSetStateCommand, CommandSource, LampSetLightCommand } from '../../src';

describe('Commands', () => {
  it('Should print a proper reason Tree', () => {
    const c1 = new LampSetLightCommand(CommandSource.Force, false, 'Testreason Lamp');
    const c2 = new ActuatorSetStateCommand(c1, true, 'Testreason Actuator');

    const result = c2.logMessage;
    expect(result).toBe(
      'Actuator setState to true with disableCommand undefined for reason: CommandType("Force") stack => LampSetLightCommand("Testreason Lamp") -> ActuatorSetStateCommand("Testreason Actuator")',
    );
  });
});
