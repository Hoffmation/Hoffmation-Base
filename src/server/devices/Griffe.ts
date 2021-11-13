import { Devices } from './devices';
import { FensterPosition } from './hmIPDevices/FensterPosition';
import { HmIpDeviceType } from './hmIPDevices/hmIpDeviceType';
import { HmIpGriff } from './hmIPDevices/hmIpGriff';

export class Griffe {
  public static getGriffPosition(): string {
    const griffe: HmIpGriff[] = Griffe.getAllGriffe();
    griffe.sort((a, b): number => {
      a.position;
      return b.position - a.position;
    });

    const response: string[] = [`Dies sind die aktuellen Stellungen der FensterGriffe:`];
    for (const g of griffe) {
      response.push(`${FensterPosition[g.position]} Fenster: "${g.info.customName}"`);
    }
    return response.join('\n');
  }

  public static getAllGriffe(): HmIpGriff[] {
    const griffe: HmIpGriff[] = [];
    for (const dID in Devices.hmIP) {
      const d = Devices.hmIP[dID];
      if (d.deviceType === HmIpDeviceType.HmIpGriff) {
        griffe.push(d as HmIpGriff);
      }
    }
    return griffe;
  }
}
