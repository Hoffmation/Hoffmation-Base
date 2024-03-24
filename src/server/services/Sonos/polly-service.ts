import AWS from 'aws-sdk';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import getMP3Duration from 'get-mp3-duration';
import crypto from 'crypto';
import { ServerLogService } from '../log-service';
import { iPollySettings } from '../../config';
import { LogLevel } from '../../../models';
import path from 'path';

export class PollyService {
  /**
   * Whether Polly-Service is active
   */
  public static active: boolean = false;
  /**
   * The API Instance
   */
  public static polly: AWS.Polly;
  private static _voice: string;
  private static _mp3Path: string;

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
    this._voice = config.voiceID;
  }

  public static getDuration(filename: string): number {
    const fPath: string = path.join(this._mp3Path, filename);
    try {
      if (fs.existsSync(fPath)) {
        return getMP3Duration(fs.readFileSync(fPath));
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
    const hash: string = `${this._voice}_${crypto.createHash('md5').update(text).digest('hex')}`;
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
      VoiceId: this._voice,
    };
    this.polly.synthesizeSpeech(params, (err, data) => {
      if (err) {
        ServerLogService.writeLog(LogLevel.Error, `AWS Polly Error: ${err}`);
        return;
      }

      if (!data || data.AudioStream === undefined) {
        ServerLogService.writeLog(LogLevel.Error, "AWS Polly didn't send any data");
        return;
      }

      ServerLogService.writeLog(LogLevel.Debug, `AWS Antwort für (${hash}) erhalten Text: "${text}"`);

      fs.writeFile(fPath, data.AudioStream as string | NodeJS.ArrayBufferView, (err) => {
        const duration: number = getMP3Duration(data.AudioStream);
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, 'AWS Polly: Saving failed');
          return;
        }
        ServerLogService.writeLog(LogLevel.Trace, 'AWS Polly: Saving sucessfully');

        cb(hash, duration);
        return;
      });
    });
  }
}
