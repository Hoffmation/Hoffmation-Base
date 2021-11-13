import { HTTPSOptions } from './HTTPSOptions';
import { ServerLogService } from './log-service';
import { LogLevel } from '../../models/logLevel';
import * as fs from 'fs';
import HTTPS from 'https';
import { Utils } from './utils/utils';

export class HTTPSService {
  private static defaultCallback(data: string, statuscode: number): void {
    ServerLogService.writeLog(LogLevel.DeepTrace, `Response statusCode:"${statuscode}"\nData:"${data}"`);
  }

  public static request(
    options: HTTPSOptions,
    postData: string = '',
    retryOnError: number = 5,
    responseCallback: (data: string, statuscode: number) => void = HTTPSService.defaultCallback,
  ): void {
    const responseData: string[] = [];
    const req = HTTPS.request(options, (res: any) => {
      res.on('data', (data: Buffer) => {
        responseData.push(data.toString());
      });
      res.on('end', () => {
        responseCallback(responseData.join(''), res.statusCode);
      });
    });
    req.on('error', (e: any) => {
      if (retryOnError > 0) {
        ServerLogService.writeLog(LogLevel.DeepTrace, `HTTPS request failed --> ${retryOnError} retries left`);
        Utils.guardedTimeout(() => {
          HTTPSService.request(options, postData, retryOnError - 1, responseCallback);
        }, 100);
      } else {
        ServerLogService.writeLog(LogLevel.Error, `HTTPS request failed after retries`);
      }
    });
    if (postData !== '') {
      req.write(postData);
    }
    req.end();
  }

  public static async downloadFile(url: string, filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      let fileInfo = null;

      const request = HTTPS.get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
          return;
        }

        fileInfo = {
          mime: response.headers['content-type'],
          size: parseInt(response.headers['content-length'], 10),
        };

        response.pipe(file);
      });

      // The destination stream is ended by the time it's called
      file.on('finish', () => resolve(true));

      request.on('error', (err: any) => {
        fs.unlink(filePath, () => resolve(false));
      });
    });
  }
}
