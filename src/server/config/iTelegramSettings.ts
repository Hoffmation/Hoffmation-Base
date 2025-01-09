import { LogLevel } from '../../models';

/**
 * The settings for the telegram-service (if needed).
 * Telegram can be used to have a communication channel to the house and to receive notifications.
 */
export interface iTelegramSettings {
  /**
   * The threshold for the log level to trigger a message to telegram
   * TODO: Maybe migrate to {@link iLogSettings}
   */
  logLevel: LogLevel;
  /**
   * The token for the telegram bot
   */
  telegramToken: string;
  /**
   * The allowed IDs for clients interacting with the bot
   */
  allowedIDs: number[];
  /**
   * The IDs that are subscribed to updates from us (e.g. for notifications)
   */
  subscribedIDs: number[];
}
