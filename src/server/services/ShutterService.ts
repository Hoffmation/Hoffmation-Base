import { Devices, DeviceType, iShutter, Window } from '../devices';
import { API } from './api';
import { ShutterSetLevelCommand } from '../../models';

export class ShutterService {
  public static anyRolloDown(rollo: iShutter[]): boolean {
    for (let i: number = 0; i < rollo.length; i++) {
      if (rollo[i].currentLevel === 0) {
        return true;
      }
    }
    return false;
  }

  public static getRolladenPosition(): string {
    const rollos: iShutter[] = ShutterService.getAllRollos();
    rollos.sort((a, b): number => {
      return b.currentLevel - a.currentLevel;
    });

    const response: string[] = [`Dies sind die aktuellen Rollo Positionen:`];
    for (const r of rollos) {
      response.push(
        `${r.currentLevel}% Rollo: "${r.info.customName}" Gewünschte Position: ${r.desiredWindowShutterLevel}`,
      );
    }
    response.push(`\nDie nächsten Zeiten zum Hochfahren:`);
    const down: string[] = [`\nDie nächsten Zeiten zum Runterfahren:`];
    for (const r of API.getRooms().values()) {
      if (!r.WindowGroup) {
        continue;
      }
      for (const f of r.WindowGroup.windows) {
        f.getShutter().forEach((shutter) => {
          response.push(
            `Rollo: "${shutter.info.customName}"\t${
              shutter.room?.settings.sonnenAufgangRollos === true
                ? r.sunriseShutterCallback?.nextToDo?.toLocaleTimeString()
                : 'Hochfahren inaktiv'
            }`,
          );
          down.push(`Rollo: "${shutter.info.customName}"\t${r.sunsetShutterCallback?.nextToDo?.toLocaleTimeString()}`);
        });
      }
    }
    response.push(down.join('\n'));
    return response.join('\n');
  }

  public static getAllRollos(): iShutter[] {
    const rollos: iShutter[] = [];
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (
        d.deviceType === DeviceType.HmIpRoll ||
        d.deviceType === DeviceType.ZigbeeIlluShutter ||
        d.deviceType === DeviceType.ZigbeeUbisysShutter
      ) {
        rollos.push(d as iShutter);
      }
    }
    return rollos;
  }

  public static windowAllToPosition(f: Window, c: ShutterSetLevelCommand): void {
    f.getShutter().forEach((s) => {
      s.setLevel(c);
    });
  }
}
