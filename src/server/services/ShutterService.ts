import { RoomBase } from '../../models/rooms/RoomBase';
import { DeviceType } from '../devices/deviceType';
import { Devices } from '../devices/devices';
import { iShutter } from '../devices/iShutter';

export class ShutterService {
  public static getRolladenPosition(): string {
    const rollos: iShutter[] = ShutterService.getAllRollos();
    rollos.sort((a, b): number => {
      return b.currentLevel - a.currentLevel;
    });

    const response: string[] = [`Dies sind die aktuellen Rollo Positionen:`];
    for (const r of rollos) {
      response.push(`${r.currentLevel}% Rollo: "${r.info.customName}" Gewünschte Position: ${r.desiredFensterLevel}`);
    }
    response.push(`\nDie nächsten Zeiten zum Hochfahren:`);
    const down: string[] = [`\nDie nächsten Zeiten zum Runterfahren:`];
    const rooms: RoomBase[] = RoomBase.allRooms;
    for (const r of rooms) {
      for (const f of r.FensterGroup.fenster) {
        if (f.rollo) {
          response.push(
            `Rollo: "${f.rollo.info.customName}"\t${
              f.noRolloOnSunrise ? 'Hochfahren inaktiv' : r.sonnenAufgangCallback?.nextToDo?.toLocaleTimeString()
            }`,
          );
          down.push(
            `Rollo: "${f.rollo.info.customName}"\t${r.sonnenUntergangCallback?.nextToDo?.toLocaleTimeString()}`,
          );
        }
      }
    }
    response.push(down.join('\n'));
    return response.join('\n');
  }

  public static getAllRollos(): iShutter[] {
    const rollos: iShutter[] = [];
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpRoll || d.deviceType === DeviceType.ZigbeeIlluShutter) {
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
}
