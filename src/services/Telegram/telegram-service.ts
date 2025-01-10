import TelegramBot from 'node-telegram-bot-api';
import { Base64Image } from '../../models';
import { iTelegramSettings } from '../../interfaces';
import { TelegramMessageCallback } from './telegramMessageCalback';
import { LogLevel } from '../../enums';
import { ServerLogService } from '../../logging';
import { Utils } from '../../utils';

export class TelegramService {
  private static subscribedIDs: number[];
  private static token: string;
  private static active: boolean = false;
  private static bot: TelegramBot;
  private static allowedIDs: number[];
  private static settings: iTelegramSettings | undefined = undefined;
  // private static restartTimeout: NodeJS.Timeout | undefined = undefined;

  private static callbacks: { [name: string]: TelegramMessageCallback } = {};

  public static addMessageCallback(pCallback: TelegramMessageCallback, reset: boolean = false): void {
    if (!reset) {
      TelegramService.callbacks[pCallback.name] = pCallback;
    }
    TelegramService.bot.onText(pCallback.identifier, (msg) => {
      if (!TelegramService.checkAuthorized(msg)) {
        return;
      }
      pCallback.callback(msg);
    });
    ServerLogService.writeLog(
      LogLevel.Debug,
      `Telegram Callback mit Namen ${pCallback.name} für Nachrichten mit "${pCallback.identifier}" hinzugefügt`,
    );
  }

  public static initialize(settings?: iTelegramSettings): void {
    if (!settings && this.settings === undefined) {
      this.active = false;
      return;
    }

    if (settings) {
      this.settings = settings;
      ServerLogService.telegramLevel = settings.logLevel;
      this.token = settings.telegramToken;
      this.allowedIDs = settings.allowedIDs;
      this.subscribedIDs = settings.subscribedIDs;
    }

    this.active = true;
    ServerLogService.telegramSending = this.sendMessageToSubscriber.bind(this);
    this.bot = new TelegramBot(this.token, { polling: true, webHook: false });
    this.bot.on('polling_error', (e) => {
      /*
      if (!this.reinitiliazeWithTimeout()) {
        return;
      }
       */
      ServerLogService.writeLog(LogLevel.Debug, `Telegram Polling Error: ${e.message}`);
      ServerLogService.writeLog(LogLevel.Trace, `Telegram Polling Error stack: ${e.stack}`);
    });
    this.bot.on('webhook_error', (e) => {
      /*
      if (!this.reinitiliazeWithTimeout()) {
        return;
      }
       */
      ServerLogService.writeLog(LogLevel.Debug, `Telegram Webhook Error: ${e.message}`);
      ServerLogService.writeLog(LogLevel.Trace, `Telegram Webhook Error stack: ${e.stack}`);
    });
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'helpCommand',
        /\/help/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return true;
          const message: string[] = [];
          message.push('Im folgenden ist eine Liste sämtlicher Kommandos:\n');
          for (const cName in TelegramService.callbacks) {
            const telegramCb: TelegramMessageCallback = TelegramService.callbacks[cName];
            message.push(
              `${telegramCb.identifier.toString().replace(/\//g, '').replace(/\\/g, '')} - ${telegramCb.helpMessage}`,
            );
          }
          TelegramService.sendMessage([m.chat.id], message.join('\n'));
          return true;
        },
        'Gibt eine Liste mit sämtlichen Kommandos aus',
      ),
    );
    TelegramService.inform('(Re-)Initialisierung abgeschlossen');
  }

  public static publishCommands(): void {
    const commands: TelegramBot.BotCommand[] = [];
    for (const cName in TelegramService.callbacks) {
      const telegramCb: TelegramMessageCallback = TelegramService.callbacks[cName];
      const commandIdentifier: string = (
        telegramCb.identifierForCommandList !== undefined ? telegramCb.identifierForCommandList : telegramCb.identifier
      )
        .toString()
        .replace(/\//g, '')
        .replace(/\\/g, '');
      commands.push({ command: commandIdentifier, description: telegramCb.helpMessage });
    }

    ServerLogService.writeLog(LogLevel.Debug, `New Telegram Commands: "${JSON.stringify(commands)}"`);
    TelegramService.bot.setMyCommands(commands).catch((e) => {
      ServerLogService.writeLog(LogLevel.Error, `Setting Telegram Commands failed with error: ${e}`);
    });
  }

  public static inform(message: string): void {
    this.sendMessage(this.subscribedIDs, message);
  }

  public static sendImage(message: string, image: Base64Image) {
    for (const id of this.subscribedIDs) {
      Utils.guardedTimeout(
        () => {
          this.bot.sendPhoto(
            id,
            image.buffer,
            { caption: message },
            {
              filename: image.name,
              contentType: image.type,
            },
          );
        },
        0,
        this,
      );
    }
  }

  public static sendMessageToSubscriber(message: string) {
    if (this.subscribedIDs.length > 0) {
      this.sendMessage(this.subscribedIDs, message);
    }
  }

  public static sendMessage(ids: number[], message: string): void {
    if (!this.active) {
      ServerLogService.writeLog(LogLevel.Debug, 'Would have send telegram message, but telegram is not active');
      return;
    }

    const chunksNeeded: number = Math.ceil(message.length / 4095);
    for (let i = 0; i < chunksNeeded; i++) {
      for (const id of ids) {
        Utils.guardedTimeout(
          () => {
            this.bot.sendMessage(id, message.substring(i * 4095, i * 4095 + 4095)).catch((r) => {
              ServerLogService.writeLog(LogLevel.Warn, `Send Telegram Message to ${id} failed: ${r}`);
            });
          },
          200 * i,
          this,
        );
      }
    }
  }

  public static checkAuthorized(msg: TelegramBot.Message): boolean {
    if ((msg.from !== undefined && this.allowedIDs.includes(msg.from?.id)) || this.allowedIDs.includes(msg.chat.id)) {
      ServerLogService.writeLog(LogLevel.Debug, `Authorisierte Telegram Message erhalten: ${JSON.stringify(msg)}`);
      return true;
    }

    ServerLogService.writeLog(LogLevel.Alert, `Fremden Telegram Nutzer erkannt. Nachricht "${JSON.stringify(msg)}"`);
    TelegramService.sendMessage(
      [msg.chat.id],
      "Hello stranger,\nExcuse me, but you're not yet on the guest list.\nPlease contact our manager.\nHave a great day",
    );
    return false;
  }

  /*
  private static reinitialize(): void {
    ServerLogService.writeLog(LogLevel.Info, `Reinitialize Telegram Bot: Stop Polling`);
    this.bot
      .startPolling({ restart: true })
      .then(() => {
        this.restartTimeout = undefined;
        this.resetMessageCallbacks();
        ServerLogService.writeLog(LogLevel.Debug, `Reinitialization of Telegram finished.`);
      })
      .catch((e) => {
        ServerLogService.writeLog(LogLevel.Info, `Can't start polling: ${e}`);
        TelegramService.reinitiliazeWithTimeout(true);
      });
  }

  public static reinitiliazeWithTimeout(force: boolean = false): boolean {
    if (this.restartTimeout !== undefined && !force) {
      return false;
    } else if (force && this.restartTimeout !== undefined) {
      clearTimeout(this.restartTimeout);
    }

    this.restartTimeout = Utils.guardedTimeout(
      () => {
        this.reinitialize();
      },
      10000,
      this,
    );
    return true;
  }
  */

  public static resetMessageCallbacks(): void {
    TelegramService.bot.clearTextListeners();
    for (const name in TelegramService.callbacks) {
      this.addMessageCallback(TelegramService.callbacks[name]);
    }
  }
}
