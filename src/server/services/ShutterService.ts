import { Devices, DeviceType, iShutter, Window } from '../devices';
import { API } from './api';

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
              f.noRolloOnSunrise ? 'Hochfahren inaktiv' : r.sonnenAufgangCallback?.nextToDo?.toLocaleTimeString()
            }`,
          );
          down.push(
            `Rollo: "${shutter.info.customName}"\t${r.sonnenUntergangCallback?.nextToDo?.toLocaleTimeString()}`,
          );
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

  public static down(shutter: iShutter, initial: boolean = false): void {
    shutter.setLevel(0, initial);
  }

  public static middle(shutter: iShutter): void {
    shutter.setLevel(50, false);
  }

  public static up(shutter: iShutter, initial: boolean = false): void {
    shutter.setLevel(100, initial);
  }

  public static windowAllDown(f: Window, initial: boolean = false): void {
    f.getShutter().forEach((s) => {
      s.setLevel(0, initial);
    });
  }

  public static windowAllMiddle(f: Window, initial: boolean = false): void {
    f.getShutter().forEach((s) => {
      s.setLevel(50, initial);
    });
  }

  public static windowAllUp(f: Window, initial: boolean = false): void {
    f.getShutter().forEach((s) => {
      s.setLevel(100, initial);
    });
  }

  public static windowAllToPosition(
    f: Window,
    position: number,
    initial: boolean = false,
    skipOpenWarning: boolean = false,
  ): void {
    f.getShutter().forEach((s) => {
      s.setLevel(position, initial, skipOpenWarning);
    });
  }
}
