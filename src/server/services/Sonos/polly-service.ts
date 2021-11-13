import AWS from 'aws-sdk';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import getMP3Duration from 'get-mp3-duration';
import crypto from 'crypto';
import { iPollySettings } from '../../config/iConfig';

export class PollyService {
  private static _mp3Path: string;
  public static active: boolean = false;
  public static polly: AWS.Polly;
  public static voice: string;

  public static initialize(config: iPollySettings): void {
    this.active = true;
    this._mp3Path = config.mp3Path;
    this.polly = new AWS.Polly({
      region: config.region,
      signatureVersion: config.signatureVersion,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.voice = config.voiceID;
  }

  public static getDuration(name: string): number {
    const fPath: string = this._mp3Path + name + '.mp3';
    try {
      if (fs.existsSync(fPath)) {
        const duration: number = getMP3Duration(fs.readFileSync(fPath));
        return duration;
      }
    } catch (err) {
      console.error(err);
    }
    return 1800000;
  }

  public static preloadTTS(text: string): void {
    if (!this.active) {
      return;
    }
    this.tts(text, (link, duration) => {
      if (duration <= 0) {
        ServerLogService.writeLog(LogLevel.Error, `Retrieving tts for "${text}" failed as duration is 0 or lower`);
      } else if (!link) {
        ServerLogService.writeLog(LogLevel.Error, `Retrieving tts for "${text}" failed as link is empty`);
      }
    });
  }

  public static tts(text: string, cb: (fileLink: string, duration: number) => void): void {
    const hash: string = `${this.voice}_${crypto.createHash('md5').update(text).digest('hex')}`;
    const fPath: string = `${this._mp3Path}${hash}.mp3`;
    try {
      if (fs.existsSync(fPath)) {
        const duration: number = getMP3Duration(fs.readFileSync(fPath));
        cb(hash, duration);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    ServerLogService.writeLog(LogLevel.Debug, `Für die Nachricht "${text}" fehlt die TTS --> bei AWS anfragen`);
    const params: AWS.Polly.SynthesizeSpeechInput = {
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: this.voice,
    };
    this.polly.synthesizeSpeech(params, (err, data) => {
      if (err) {
        ServerLogService.writeLog(LogLevel.Error, `AWS Polly Error: ${err}`);
        return;
      }

      if (!data || data.AudioStream === undefined) {
        ServerLogService.writeLog(LogLevel.Error, `AWS Polly didn't send any data`);
        return;
      }

      ServerLogService.writeLog(LogLevel.Debug, `AWS Antwort für (${hash}) erhalten Text: "${text}"`);

      fs.writeFile(fPath, data.AudioStream as string | NodeJS.ArrayBufferView, (err) => {
        const duration: number = getMP3Duration(data.AudioStream);
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, `AWS Polly: Saving failed`);
          return;
        }
        ServerLogService.writeLog(LogLevel.Trace, `AWS Polly: Saving sucessfully`);

        cb(hash, duration);
        return;
      });
    });
  }
}
