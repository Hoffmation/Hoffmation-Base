import { BaseAction } from './baseAction';
import { CommandSource, CommandType } from '../enums';
import { iAirQualityCollector, iAirQualityReadings } from '../interfaces';

export class AirQualitySensorChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.AirQualitySensorChangeAction;
  /**
   * The new readings of the sensor
   */
  public readonly newReadings: iAirQualityReadings;
  /**
   * The sensor that triggered the action
   */
  public readonly sensor: iAirQualityCollector;

  public constructor(sensor: iAirQualityCollector, newReadings: iAirQualityReadings) {
    super(CommandSource.Automatic, `${sensor.customName} detected an air quality index of ${newReadings.aqi}`);
    this.newReadings = newReadings;
    this.sensor = sensor;
  }
}
