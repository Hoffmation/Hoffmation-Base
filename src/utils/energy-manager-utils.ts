import { iExcessEnergyConsumer } from '../interfaces';
import { EnergyConsumerStateChange } from './energy-consumer-state-change';
import { LogLevel } from '../enums';

export class EnergyManagerUtils {
  public static turnOnAdditionalConsumer(
    excessEnergyConsumer: iExcessEnergyConsumer[],
    lastDeviceChange: EnergyConsumerStateChange | undefined,
  ): void | undefined | EnergyConsumerStateChange {
    const potentialDevices: iExcessEnergyConsumer[] = excessEnergyConsumer.filter((e) => {
      if (e.energySettings.priority === -1 || e.on || !e.isAvailableForExcessEnergy()) {
        return false;
      }
      if (lastDeviceChange?.newState && e === lastDeviceChange.device) {
        e.log(
          LogLevel.Debug,
          'This woould have been a matching energy consumer, but apperantly last turn on failed...',
        );
        return false;
      }
      return true;
    });
    if (potentialDevices.length === 0) {
      if (lastDeviceChange?.newState === true) {
        return undefined;
      }
      return;
    }
    potentialDevices.sort((a, b) => {
      return b.energySettings.priority - a.energySettings.priority;
    });
    return { newState: true, device: potentialDevices[0] };
  }

  public static turnOffAdditionalConsumer(
    excessEnergyConsumer: iExcessEnergyConsumer[],
    lastDeviceChange: EnergyConsumerStateChange | undefined,
  ): void | undefined | EnergyConsumerStateChange {
    const potentialDevices: iExcessEnergyConsumer[] = excessEnergyConsumer.filter((e) => {
      if (e.energySettings.priority === -1 || !e.on) {
        return false;
      }
      if (!e.wasActivatedByExcessEnergy()) {
        e.log(LogLevel.Info, 'This would have been turned off, but was activated manually....');
        return false;
      }
      if (lastDeviceChange?.newState === false && e === lastDeviceChange.device) {
        e.log(
          LogLevel.Debug,
          'This woould have been a matching turn off energy consumer, but apperantly last turn off failed...',
        );
        return false;
      }
      return true;
    });
    if (potentialDevices.length === 0) {
      if (lastDeviceChange?.newState === false) {
        return undefined;
      }
      return;
    }
    potentialDevices.sort((a, b) => {
      return a.energySettings.priority - b.energySettings.priority;
    });
    return { newState: false, device: potentialDevices[0] };
  }
}
