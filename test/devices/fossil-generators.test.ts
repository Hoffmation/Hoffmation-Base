import { DeviceCapability, Devices, iBaseDevice, iFossilGeneratorSource, LogLevel, Utils } from '../../src';
import {
  announceGenerator,
  GENERATOR_CONVERSION_FACTOR,
  GENERATOR_RATED_WATTAGE,
  LogEntry,
  Plant,
  plant,
  tearDownPlant,
} from '../support/plant-history';

jest.mock('unifi-access', () => jest.fn());

Utils.testInitializeServices();

/**
 * K12 - which fuel burning generators a plant has is the plant's own answer.
 *
 * A generator is one because it says so while it is being constructed, not because a caller listed it
 * somewhere. That is what lets a second unit be an entry more in a list rather than a change in the code that
 * removes its share from the recorded history, and it is why a plant without an energy manager still knows
 * its own generators.
 *
 * Every id below is synthetic and unique per case: the report of an incomplete generator remembers what it
 * already said, so two cases sharing an id would test each other's leftovers.
 */

/**
 * The generators of the plant.
 * @returns One id per announced generator, the id its state changes are recorded under.
 */
function announcedGeneratorIds(): string[] {
  return Devices.fossilGenerators.map((generator: iFossilGeneratorSource) => generator.actuatorId);
}

describe('which fuel burning generators the plant has', () => {
  afterEach(() => {
    tearDownPlant();
  });

  it('K12-0 lets the unit announce itself, and keeps its two numbers its own', () => {
    const p: Plant = plant();

    // The unit is a generator because it says so, not because a caller listed it somewhere.
    expect(p.dachs.deviceCapabilities).toContain(DeviceCapability.fossilGenerator);
    expect(announcedGeneratorIds()).toEqual([p.dachs.id]);
    expect(Devices.fossilGenerators[0].ratedElectricalWattage).toBe(GENERATOR_RATED_WATTAGE);
    expect(Devices.fossilGenerators[0].conversionFactor).toBe(GENERATOR_CONVERSION_FACTOR);

    p.dachs.settings.dachsRatedElectricalWattage = 3000;

    // A live view, not a copy taken when the unit was built: both numbers are editable at runtime.
    expect(Devices.fossilGenerators[0].ratedElectricalWattage).toBe(3000);
  });

  it('K12-3 leaves a device without the capability out', () => {
    const p: Plant = plant();
    const NOT_A_GENERATOR: string = 'test-plain-actuator-k12-3';
    // Carries the rating and the conversion factor of a generator, so only the missing capability can be what
    // keeps it out - otherwise this would pass against a filter that reads any of the three fields.
    Devices.alLDevices[NOT_A_GENERATOR] = {
      id: NOT_A_GENERATOR,
      actuatorId: NOT_A_GENERATOR,
      ratedElectricalWattage: GENERATOR_RATED_WATTAGE,
      conversionFactor: GENERATOR_CONVERSION_FACTOR,
      deviceCapabilities: [DeviceCapability.actuator],
    } as unknown as iBaseDevice;

    expect(announcedGeneratorIds()).toEqual([p.dachs.id]);
  });

  it('K12-3b leaves out a device that carries the capability but not the numbers, and says so', () => {
    const p: Plant = plant();
    const INCOMPLETE_GENERATOR: string = 'test-incomplete-generator-k12-3b';
    // Announced as a generator, but without the two numbers a generator has to state. Cast into the role
    // unchecked, both come out undefined, the correction turns into NaN and the entry is dropped silently -
    // the day is then under corrected, which makes the photovoltaic look better than it was.
    Devices.alLDevices[INCOMPLETE_GENERATOR] = {
      id: INCOMPLETE_GENERATOR,
      actuatorId: INCOMPLETE_GENERATOR,
      deviceCapabilities: [DeviceCapability.fossilGenerator],
    } as unknown as iBaseDevice;
    p.resetRecordings();

    const ids: string[] = announcedGeneratorIds();

    expect(ids).toEqual([p.dachs.id]);
    // Silently leaving it out would be the same failure one seam further on, so it has to be said.
    expect(
      p.logs.some((entry: LogEntry) => entry.level === LogLevel.Error && entry.message.includes(INCOMPLETE_GENERATOR)),
    ).toBe(true);
  });

  it('K12-5 does not let the order the devices were built in decide', () => {
    const BEFORE: string = 'test-generator-before-k12-5';
    const AFTER: string = 'test-generator-after-k12-5';
    // Devices are constructed in the order the installation's configuration lists them, and the reading
    // service is built by one of them. One generator on each side of that moment.
    announceGenerator(BEFORE);
    const p: Plant = plant();
    announceGenerator(AFTER);

    expect(announcedGeneratorIds().sort()).toEqual([p.dachs.id, BEFORE, AFTER].sort());
  });

  it('K12-6 keeps the generators of a plant its own while there is no energy manager at all', () => {
    const SECOND: string = 'test-generator-second-k12-6';
    const p: Plant = plant();
    announceGenerator(SECOND);
    Devices.energymanager = undefined;

    // Installations run without either of the two energy managers, and the generators of such a plant are
    // still its own - the list is read off the devices and has never depended on a manager. What such a plant
    // does not do is read anything at all, which is a case of the reading service.
    expect(announcedGeneratorIds().sort()).toEqual([p.dachs.id, SECOND].sort());
  });
});
