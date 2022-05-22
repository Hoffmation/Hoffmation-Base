import { iButtonSwitch } from '../../iButtonSwitch';
import { ZigbeeDevice } from './zigbeeDevice';
import { DeviceInfo } from '../../DeviceInfo';
import { DeviceType } from '../../deviceType';
import { Button } from '../../button';

export abstract class ZigbeeSwitch extends ZigbeeDevice implements iButtonSwitch {
  public abstract buttonBot: Button | undefined;
  public abstract buttonBotLeft: Button | undefined;
  public abstract buttonBotRight: Button | undefined;
  public abstract buttonMidLeft: Button | undefined;
  public abstract buttonMidRight: Button | undefined;
  public abstract buttonTop: Button | undefined;
  public abstract buttonTopLeft: Button | undefined;
  public abstract buttonTopRight: Button | undefined;

  public constructor(pInfo: DeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverrride: boolean = false): void {
    super.update(idSplit, state, initial, pOverrride);
  }

  public abstract getButtonAssignment(): string;
}
