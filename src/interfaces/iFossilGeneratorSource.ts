/**
 * One fuel burning generator of the plant, seen from the history: the actuator whose recorded state
 * changes say when it ran, plus what one hour of that run put into the battery.
 *
 * Implemented by the generator device itself, which is why the two numbers below are the device's own and
 * not the asking caller's: what a unit is rated at and how much of that reaches the battery is a property of
 * that machine, and nobody else can state it. Which generators the plant has is not asked here - a device
 * carrying {@link DeviceCapability.fossilGenerator} is one, see {@link Devices.fossilGenerators}.
 *
 * Three values and no device surface, because the history only ever asks the persistence about them - a
 * reader of this list is handed the generator's id, rating and factor and has no reason to know it is
 * looking at a device at all.
 */
export interface iFossilGeneratorSource {
  /** The device id the state changes of the generator are recorded under */
  readonly actuatorId: string;
  /** Electrical rating of the generator in watt */
  readonly ratedElectricalWattage: number;
  /** Share of the generated energy that reached the battery, between 0 and 1 */
  readonly conversionFactor: number;
}
