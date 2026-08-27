import { iBatteryDevice, iSoilCollector, iSoilSensor } from '../../../interfaces';
import { BatteryLevelChangeAction, SoilSensorChangeAction } from '../../../action';
import { ZigbeeDevice } from './zigbeeDevice';
import { Battery, SoilSensor } from '../../sharedFunctions';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../../enums';

/**
 * The common part of every zigbee device measuring the moisture of the soil it sits in.
 *
 * Carries the smallest honest contract: soil moisture and battery, the two states every such sensor reports.
 * Ambient temperature and humidity are deliberately NOT here - a sensor that only reads the soil would then
 * claim capabilities it does not have. A device that measures them adds those axes itself, see
 * {@link ZigbeeCooloSoilSensor}.
 */
export class ZigbeeSoilSensor extends ZigbeeDevice implements iSoilCollector, iBatteryDevice {
  /** @inheritDoc */
  public soilSensor: iSoilSensor = new SoilSensor(this);
  /** @inheritDoc */
  public battery: Battery = new Battery(this);

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this.deviceCapabilities.push(DeviceCapability.soilSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public get soilMoisture(): number {
    return this.soilSensor.soilMoisture;
  }

  /** @inheritDoc */
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this.battery.addBatteryLevelCallback(pCallback);
  }

  /** @inheritDoc */
  public addSoilMoistureCallback(pCallback: (action: SoilSensorChangeAction) => void): void {
    this.soilSensor.addSoilMoistureCallback(pCallback);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
      case 'soil_moisture':
        this.soilSensor.soilMoisture = state.val as number;
        break;
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    this.soilSensor.dispose();
    super.dispose();
  }
}
