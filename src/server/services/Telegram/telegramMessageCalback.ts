import TelegramBot from 'node-telegram-bot-api';

export class TelegramMessageCallback {
  public constructor(
    public name: string,
    public identifier: RegExp,
    public callback: (message: TelegramBot.Message) => Promise<boolean>,
    public helpMessage: string,
    public identifierForCommandList?: RegExp,
  ) {}
}
