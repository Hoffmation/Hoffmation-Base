import { Persist } from '../services/dbo/persist';
import { Devices } from './devices';
import { HmIpDeviceType } from './hmIPDevices/hmIpDeviceType';
import { HmIpHeizgruppe } from './hmIPDevices/hmIpHeizgruppe';
import { HmIpHeizung } from './hmIPDevices/hmIpHeizung';
import { TemperaturDataPoint } from '/models/persistence/temperaturDataPoint';

export class Heizgruppen {
  public static getInfo(): string {
    const gruppen: HmIpHeizgruppe[] = Heizgruppen.getAllGruppen();
    gruppen.sort((a, b): number => {
      return a.info.customName.localeCompare(b.info.customName);
    });

    const response: string[] = [`Dies sind die aktuellen Informationen der Heizungen:`];
    response.push(`Name\t\tLuft Feuchtigkeit\t\tAktuelle Temperatur\t\tSoll Temperatur\t\tVentilstellung`);
    for (const g of gruppen) {
      response.push(
        `${g.info.customName}:\t\t${g.humidity}%\t\t${g.sTemperatur}\t\t${g.desiredTemperatur}°C\t\t${g.sLevel}`,
      );
    }
    return response.join('\n');
  }

  public static async getSpecificInfo(pText: string | undefined): Promise<string> {
    if (pText === undefined || !pText.includes('"')) {
      return `Bitte übergeben Sie eine Heizgruppe innerhalb von "". z.B. "EG Flur HeizGr"`;
    }
    const searchText = pText.split('"')[1];
    const group: HmIpHeizgruppe | undefined = this.getSpecificGroup(searchText);

    if (group === undefined) {
      return `"${searchText}" ist keine gültige Heizgruppe, im Folgenden ist eine Liste aller gültigen Heizgruppen:\n${this.getInfo()}`;
    }

    const results: TemperaturDataPoint[] = await Persist.readTemperaturDataPoint(group, 20);
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
      const heizungen: HmIpHeizung[] = g.getBelongingHeizungen();
      const tempProblem: string[] = [`${g.info.room}\t\t${g.iTemperatur}°C\t\t${g.info.customName}`];
      let print = false;
      for (const h of heizungen) {
        if (h.iTemperatur !== g.iTemperatur) {
          print = true;
        }
        tempProblem.push(`${h.info.room}\t\t${h.iTemperatur}°C\t\t${h.info.customName}`);
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
    for (const dID in Devices.hmIP) {
      const d = Devices.hmIP[dID];
      if (d.deviceType === HmIpDeviceType.HmIpHeizgruppe) {
        gruppen.push(d as HmIpHeizgruppe);
      }
    }
    return gruppen;
  }

  public static getSpecificGroup(name: string): HmIpHeizgruppe | undefined {
    for (const dID in Devices.hmIP) {
      const d = Devices.hmIP[dID];
      if (d.deviceType === HmIpDeviceType.HmIpHeizgruppe && d.info.customName === name) {
        return d as HmIpHeizgruppe;
      }
    }

    return undefined;
  }
}
