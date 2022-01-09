import { DeviceSettings } from './deviceSettings';

export class ActuatorSettings extends DeviceSettings {
  public dawnOn: boolean = true;
  public duskOn: boolean = true;
  public nightOn: boolean = true;
}
