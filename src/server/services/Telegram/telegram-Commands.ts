import TelegramBot from 'node-telegram-bot-api';
import { Devices } from '../../devices/devices';
import { TelegramService } from './telegram-service';
import { TelegramMessageCallback } from './telegramMessageCalback';
import { Griffe } from '../../devices/Griffe';
import { Heizgruppen } from '../../devices/Heizgruppen';
import { Rolladen } from '../../devices/Rollos';
import { ZigbeeAquaraVibra } from '../../devices/zigbee/zigbeeAquaraVibra';
import { ZigbeeDeviceType } from '../../devices/zigbee/zigbeeDeviceType';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { SonosService } from '../Sonos/sonos-service';
import { HmIpDeviceType } from '../../devices/hmIPDevices/hmIpDeviceType';
import { HmIpTaster } from '../../devices/hmIPDevices/hmIpTaster';

export class TelegramCommands {
  public static initialize(): void {
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AlarmStop',
        /\/stop_alarm/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomBase.clearAllAlarms();
          TelegramService.sendMessage(
            [m.from.id],
            'Alle ausgelösten Wasser-/Rauchmelder und Eindringlingsalarme wurden gestoppt.',
          );
          return true;
        },
        'Eine Möglichkeit bei Fehlalarm den Alarm abzuschalten',
      ),
    );
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AwayModeStart',
        /\/away_mode_start/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomBase.startAwayMode();
          TelegramService.inform('Der Abwesenheitsmodus ist initiiert');
          return true;
        },
        'Eine Möglichkeit die Alarmanlage scharfzuschalten',
      ),
    );
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'NightAlarmMode',
        /\/nightalarm_mode_start/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomBase.startNightAlarmMode();
          TelegramService.inform('Der Nachtmodus ist initiiert');
          return true;
        },
        'Alarmanlage für die Nacht scharf schalten',
      ),
    );
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AlarmModesEnd',
        /\/alarm_modes_end/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomBase.endAlarmModes();
          TelegramService.sendMessage([m.from.id], 'Der Abwesenheitsmodus ist deaktiviert.');
          return true;
        },
        'Alarmanlage nach Abwesenheit/Nacht entschärfen',
      ),
    );
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'LastMovements',
        /\/check_movement/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage(
            [m.from.id],
            `Im Folgenden sind die letzten Bewegungen\n${RoomBase.getLastMovements()}`,
          );
          return true;
        },
        'Gibt die letzten Bewegungen inkl. ihrer Uhrzeit aus.',
      ),
    );
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'TelegramTest',
        /\/test/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.from.id], 'Hallo, ich bin der HoffMation Bot.');
          return true;
        },
        'Eine Möglichkeit die Verknüpfung mit dem HoffMation Bot zu testen',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'RolloObenCheck',
        /\/check_rollo/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.from.id], Rolladen.getRolladenPosition());
          return true;
        },
        'Gibt die Positionen der Rollos aus, warnt über offene Rollos und nennt die nächsten Fahrten',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'FensterCheck',
        /\/check_fenster/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.from.id], Griffe.getGriffPosition());
          return true;
        },
        'Gibt die Positionen der Fenstergriffe aus und warnt somit über offene Fenster',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'HeizungCheck',
        /\/check_temperatur/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.from.id], Heizgruppen.getInfo());
          return true;
        },
        'Gibt die Namen und aktuellen Werte sämtlicher Heizgruppen aus (aktuelle Temperatur, Soll Temperatur, Ventilstellung).',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'HeizungError',
        /\/temperatur_error/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.from.id], Heizgruppen.getProblems());
          return true;
        },
        'Zeigt Differenzen zwischen Heizungen und den jeweiligen Heizgruppen auf',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'HeizungCheckOne',
        /\/check_1_temperatur.*/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.from.id], await Heizgruppen.getSpecificInfo(m.text));
          return true;
        },
        `Gibt den Verlauf der in \\"\\" übergebenen Heizgruppe aus.`,
        /\/check_1_temperatur/,
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AllRolloDown',
        /\/all_rollo_down/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomBase.setAllRolloOfFloor(-1, 0);
          TelegramService.sendMessage([m.from.id], `Es werden alle Rollos heruntergefahren`);
          return true;
        },
        `Fährt alle rollos runter`,
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'VibrationSensitivity',
        /\/set_vibration_sensitivity/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          for (const id in Devices.Zigbee) {
            const d = Devices.Zigbee[id];
            if (d.deviceType === ZigbeeDeviceType.ZigbeeAquaraVibra) {
              (d as ZigbeeAquaraVibra).setSensitivity(2);
            }
          }
          TelegramService.sendMessage([m.from.id], 'Abgeschlossen');
          return true;
        },
        `Setzt alle Vibrationsensoren auf High`,
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AllButtonAssignments',
        /\/get_all_button_assignments/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          const response: string[] = ['These are the assignments for all buttons'];
          for (const id in Devices.hmIP) {
            const d = Devices.hmIP[id];
            if (d.deviceType === HmIpDeviceType.HmIpTaster) {
              response.push((d as HmIpTaster).getTastenAssignment());
            }
          }
          TelegramService.sendMessage([m.from.id], response.join('\n'));
          return true;
        },
        `Retrieves the button assignments for all buttons in home`,
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'SonosTest',
        /\/perform_sonos_test/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          SonosService.speakTestMessageOnEachDevice();
          TelegramService.sendMessage([m.from.id], 'Testnachricht gesprochen --> Führe weiteren Test durch');
          SonosService.checkAll();
          return true;
        },
        `Spiele eine kurze Nachricht auf allen Sonos Geräten um diese zu identifizieren`,
      ),
    );
  }
}
