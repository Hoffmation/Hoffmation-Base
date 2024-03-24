import { HmIpGriff } from './hmIPDevices';
import { DeviceType } from './deviceType';
import { WindowPosition } from './models';
import { Devices } from './devices';

export class Griffe {
  public static getGriffPosition(): string {
    const griffe: HmIpGriff[] = Griffe.getAllGriffe();
    griffe.sort((a, b): number => {
      return b.position - a.position;
    });

    const response: string[] = ["These are the current handle positions:"];
    for (const g of griffe) {
      response.push(`${WindowPosition[g.position]} Window: "${g.info.customName}"`);
    }
    return response.join('\n');
  }

  public static getAllGriffe(): HmIpGriff[] {
    const griffe: HmIpGriff[] = [];
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpGriff) {
        griffe.push(d as HmIpGriff);
      }
    }
    return griffe;
  }
}
