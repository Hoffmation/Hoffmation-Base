import TelegramBot from 'node-telegram-bot-api';
import { Devices, DeviceType, Griffe, HeatGroup, Heizgruppen, HmIpTaster, ZigbeeAquaraVibra } from '../../devices';
import { TelegramMessageCallback } from './telegramMessageCalback';
import { ShutterService } from '../ShutterService';
import { TelegramService } from './telegram-service';
import { RoomService } from '../room-service';
import { CommandSource, FloorSetAllShuttersCommand } from '../../../models';

export class TelegramCommands {
  public static initialize(): void {
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AlarmStop',
        /\/stop_alarm/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomService.clearAllAlarms();
          TelegramService.sendMessage(
            [m.chat.id],
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
          RoomService.startAwayMode();
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
          RoomService.startNightAlarmMode();
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
          RoomService.endAlarmModes();
          TelegramService.sendMessage([m.chat.id], 'Der Abwesenheitsmodus ist deaktiviert.');
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
            [m.chat.id],
            `Im Folgenden sind die letzten Bewegungen\n${RoomService.getLastMovements()}`,
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
          TelegramService.sendMessage([m.chat.id], 'Hallo, ich bin der HoffMation Bot.');
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
          TelegramService.sendMessage([m.chat.id], ShutterService.getRolladenPosition());
          return true;
        },
        'Gibt die Positionen der Rollos aus, warnt über offene Rollos und nennt die nächsten Fahrten',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'WindowCheck',
        /\/check_windows/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.chat.id], Griffe.getGriffPosition());
          return true;
        },
        'Returns the handle positions and warns about open windows.',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'BatteryCheck',
        /\/check_battery/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return Promise.resolve(false);
          TelegramService.sendMessage([m.chat.id], Devices.getBatteryInfo());
          return Promise.resolve(true);
        },
        'Returns a list of all battery driven devices in ascending order.',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'HeizungCheck',
        /\/check_temperatur/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          TelegramService.sendMessage([m.chat.id], HeatGroup.getInfo());
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
          TelegramService.sendMessage([m.chat.id], Heizgruppen.getProblems());
          return true;
        },
        'Zeigt Differenzen zwischen Heizungen und den jeweiligen Heizgruppen auf',
      ),
    );

    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AllRolloDown',
        /\/all_rollo_down/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          RoomService.setAllShutterOfFloor(
            new FloorSetAllShuttersCommand(CommandSource.Manual, 0, undefined, 'Telegram command AllRolloDown'),
          );
          TelegramService.sendMessage([m.chat.id], `Es werden alle Rollos heruntergefahren`);
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
          for (const id in Devices.alLDevices) {
            const d = Devices.alLDevices[id];
            if (d.deviceType === DeviceType.ZigbeeAquaraVibra) {
              (d as ZigbeeAquaraVibra).setSensitivity(2);
            }
          }
          TelegramService.sendMessage([m.chat.id], 'Abgeschlossen');
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
          for (const id in Devices.alLDevices) {
            const d = Devices.alLDevices[id];
            if (d.deviceType === DeviceType.HmIpTaster) {
              response.push((d as HmIpTaster).getButtonAssignment());
            }
          }
          TelegramService.sendMessage([m.chat.id], response.join('\n'));
          return true;
        },
        `Retrieves the button assignments for all buttons in home`,
      ),
    );

    if (Devices.energymanager !== undefined) {
      TelegramService.addMessageCallback(
        new TelegramMessageCallback(
          'EnergyManager',
          /\/get_energy_values/,
          async (m: TelegramBot.Message): Promise<boolean> => {
            if (m.from === undefined) return false;
            const response: string[] = ['Current Energy Manager report:'];
            response.push(Devices.energymanager?.getReport() ?? 'No Energy Manager found');
            TelegramService.sendMessage([m.chat.id], response.join('\n'));
            return true;
          },
          `Retrieves the current energy manager values`,
        ),
      );
    }
  }
}
