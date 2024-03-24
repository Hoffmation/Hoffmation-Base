import * as fs from 'fs';
import HTTPS from 'https';
import { ServerLogService } from './log-service';
import { Utils } from './utils';
import { LogLevel } from '../../models';
import { HTTPSOptions } from './HTTPSOptions';
import path from 'path';
import { IncomingMessage } from 'http';
import { FileInfo } from './file-info';

export class HTTPSService {
  public static request(
    options: HTTPSOptions,
    postData: string = '',
    retryOnError: number = 5,
    responseCallback: (data: string, statuscode: number) => void = HTTPSService.defaultCallback,
  ): void {
    const responseData: string[] = [];
    const req = HTTPS.request(options, (res: IncomingMessage) => {
      res.on('data', (data: Buffer) => {
        responseData.push(data.toString());
      });
      res.on('end', () => {
        responseCallback(responseData.join(''), res.statusCode ?? 0);
      });
    });
    req.on('error', (e: Error) => {
      ServerLogService.writeLog(LogLevel.DeepTrace, `HTTPS Error: ${e}`);
      if (retryOnError > 0) {
        ServerLogService.writeLog(LogLevel.DeepTrace, `HTTPS request failed --> ${retryOnError} retries left`);
        Utils.guardedTimeout(() => {
          HTTPSService.request(options, postData, retryOnError - 1, responseCallback);
        }, 100);
      } else {
        ServerLogService.writeLog(LogLevel.Error, "HTTPS request failed after retries");
      }
    });
    if (postData !== '') {
      req.write(postData);
    }
    req.end();
  }

  /**
   * Downloads a file from a given url to the given location.
   * If the location doesn't exist, it will be created quietly.
   * @param url - URL to download file from
   * @param filePath - Path to save file to
   * @returns A promise that resolves to true if the file was downloaded successfully, false otherwise
   */
  public static async downloadFile(url: string, filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // if directory structure doesn't exist yet, create it
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      const file = fs.createWriteStream(filePath);
      let fileInfo: FileInfo | null = null;

      const request = HTTPS.get(url, (response: IncomingMessage) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
          return;
        }

        fileInfo = {
          mime: response.headers['content-type'] ?? '',
          size: parseInt(response.headers['content-length'] ?? '0', 10),
        };

        ServerLogService.writeLog(
          LogLevel.DeepTrace,
          `Downloaded File\tType: "${fileInfo.mime}"\tSize:${fileInfo.size}`,
        );
        response.pipe(file);
      });

      // The destination stream is ended by the time it's called
      file.on('finish', () => resolve(true));

      request.on('error', (err: Error) => {
        ServerLogService.writeLog(LogLevel.DeepTrace, `Error Downloading File: ${err}`);
        fs.unlink(filePath, () => resolve(false));
      });
    });
  }

  private static defaultCallback(data: string, statuscode: number): void {
    ServerLogService.writeLog(LogLevel.DeepTrace, `Response statusCode:"${statuscode}"\nData:"${data}"`);
  }
}
