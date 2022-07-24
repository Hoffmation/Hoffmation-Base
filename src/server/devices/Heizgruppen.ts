import { DeviceType } from './deviceType';
import { TemperaturDataPoint } from '../../models';
import { HmIpHeizgruppe } from './hmIPDevices';
import { Devices } from './devices';
import { iHeater } from './baseDeviceInterfaces';
import { Utils } from '../services';
import { HeatGroup } from './groups';

export class Heizgruppen {
  public static async getSpecificInfo(pText: string | undefined): Promise<string> {
    if (pText === undefined || !pText.includes('"')) {
      return `Bitte übergeben Sie eine Heizgruppe innerhalb von "". z.B. "EG Flur HeizGr"`;
    }
    const searchText = pText.split('"')[1];
    const group: HmIpHeizgruppe | undefined = this.getSpecificGroup(searchText);

    if (group === undefined) {
      return `"${searchText}" ist keine gültige Heizgruppe, im Folgenden ist eine Liste aller gültigen Heizgruppen:\n${HeatGroup.getInfo()}`;
    }

    const results: TemperaturDataPoint[] = (await Utils.dbo?.readTemperaturDataPoint(group, 20)) ?? [];
    const response: string[] = [`Dies sind die letzten 20 Messpunkte der Heizgruppe:`];
    response.push(`Zeitpunkt\t\tIst-Temperatur\t\tSoll-Temperatur\t\tVentilstellung`);
    for (const r of results) {
      response.push(
        `${r.date.toLocaleTimeString('de-DE')}:\t\t${r.istTemperatur}°C\t\t${r.sollTemperatur}°C\t\t${r.level}%`,
      );
    }
    return response.join('\n');
  }

  public static getProblems(): string {
    const groups: HmIpHeizgruppe[] = this.getAllGruppen();

    const response: string[] = [`Dies sind die bestehenden Differenzen:`];
    response.push(`Raumname\t\tIst-Temperatur\t\tGerät`);
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
