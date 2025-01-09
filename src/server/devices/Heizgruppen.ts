import { DeviceType } from './deviceType.js';
import { HmIpHeizgruppe } from './hmIPDevices/index.js';
import { iHeater } from './baseDeviceInterfaces/index.js';
import { Devices } from './devices.js';

export class Heizgruppen {
  public static getProblems(): string {
    const groups: HmIpHeizgruppe[] = this.getAllGruppen();

    const response: string[] = ['Dies sind die bestehenden Differenzen:'];
    response.push('Raumname\t\tIst-Temperatur\t\tGerät');
    for (const g of groups) {
      const heizungen: iHeater[] = g.getBelongingHeizungen();
      const tempProblem: string[] = [`${g.info.room}\t\t${g.iTemperature}°C\t\t${g.info.customName}`];
      let print = false;
      for (const h of heizungen) {
        if (h.iTemperature !== g.iTemperature) {
          print = true;
        }
        tempProblem.push(`${h.info.room}\t\t${h.iTemperature}°C\t\t${h.info.customName}`);
      }
      if (print) {
        response.push(tempProblem.join('\n'));
        response.push(' ');
      }
    }
    return response.join('\n');
  }

  public static getAllGruppen(): HmIpHeizgruppe[] {
    const gruppen: HmIpHeizgruppe[] = [];
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpHeizgruppe) {
        gruppen.push(d as HmIpHeizgruppe);
      }
    }
    return gruppen;
  }

  public static getSpecificGroup(name: string): HmIpHeizgruppe | undefined {
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpHeizgruppe && d.info.customName === name) {
        return d as HmIpHeizgruppe;
      }
    }

    return undefined;
  }
}
