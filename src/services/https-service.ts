import * as fs from 'fs';
import HTTPS from 'https';
import path from 'path';
import { HTTPSOptions } from './HTTPSOptions';
import { IncomingMessage } from 'http';
import { ServerLogService } from '../logging';
import { LogLevel } from '../enums';
import { Utils } from '../utils';
import { FileInfo } from './file-info';

export class HTTPSService {
  /**
   * The status code the callback is handed for a request that produced no answer: no answer of the endpoint,
   * an exhausted retry chain, a failing socket or a failing response.
   *
   * Negative on purpose. It is outside the range HTTP status codes occupy, so no comparison a caller writes
   * against a real code - `=== 200`, a check for the successful range, a switch over the classes - can match
   * it by accident; a failure that a caller reads as success is worse than one it never hears about. Zero was
   * not an option: the successful path already yields it for an answer that ended without a status code, so
   * the two cases would be indistinguishable.
   */
  public static readonly failureStatusCode: number = -1;
  /**
   * The body the callback is handed alongside `failureStatusCode`.
   *
   * Not the empty string, which a caller looking only at the body would take for an answer that happened to
   * carry nothing. It names neither host nor path, because a caller is free to log what it receives and the
   * path of a request carries its query.
   */
  public static readonly failureResponse: string = 'HTTPS request failed';
  /**
   * How long one attempt may go without any traffic on its socket before it is given up on and handed to the
   * retry chain.
   *
   * A limit is needed at all because silence is not an error: an endpoint that accepts the connection and
   * then says nothing produces neither `error` nor `response`, so without one the attempt - and every caller
   * waiting on its callback - stays open until the process ends.
   *
   * Thirty seconds, because the whole chain has to stay inside the cadence of the callers that repeat: the
   * weather service asks every ten minutes, and the default of five retries makes six attempts, so a fully
   * silent endpoint costs about three minutes. That leaves a request no way to still be running when the next
   * one starts, while staying far above the seconds a loaded endpoint may legitimately need to answer.
   */
  public static readonly requestTimeoutMs: number = 30000;

  /**
   * Sends one HTTPS request and reports its outcome to `responseCallback` **exactly once**, on every way the
   * request can end: an answer, an exhausted retry chain, a failing socket or a failing response. A caller
   * may therefore wrap this in a promise and rely on it settling.
   * @param options - Host, path, headers, method and port of the request
   * @param postData - The body to send; nothing is written when it is empty
   * @param retryOnError - How many further attempts a failing socket may cost before the request is given up
   * @param responseCallback - Receives body and status code; a failure arrives as `failureResponse` and
   * `failureStatusCode`
   */
  public static request(
    options: HTTPSOptions,
    postData: string = '',
    retryOnError: number = 5,
    responseCallback: (data: string, statuscode: number) => void = HTTPSService.defaultCallback,
  ): void {
    const responseData: string[] = [];
    // True as soon as this attempt has done with the callback: either it has delivered the outcome, or it has
    // handed the attempt to a retry that delivers for it. Both ways out of a request can fire for the same
    // one - a socket error may still arrive after the response has ended, and an `end` may follow an error on
    // the response - and every one of them is guarded by this flag. Two calls would be a new fault class in
    // place of the old one, and an unguarded late error would open a second retry chain that calls the
    // callback again from its own end.
    let settled: boolean = false;
    const settle = (data: string, statuscode: number): void => {
      if (settled) {
        return;
      }
      settled = true;
      responseCallback(data, statuscode);
    };
    // A copy rather than the options themselves: the limit belongs to this service, not to the request the
    // caller described, and a caller may hand the same options to a second request.
    const req = HTTPS.request({ ...options, timeout: HTTPSService.requestTimeoutMs }, (res: IncomingMessage) => {
      res.on('data', (data: Buffer) => {
        responseData.push(data.toString());
      });
      res.on('end', () => {
        settle(responseData.join(''), res.statusCode ?? 0);
      });
      res.on('error', (e: Error) => {
        ServerLogService.writeLog(LogLevel.Error, `HTTPS Error: ${e}`);
        // No retry from here: part of the answer may already have been handed out, and repeating a request
        // whose body was sent is not free. The response ends here, so the caller hears about it here.
        settle(HTTPSService.failureResponse, HTTPSService.failureStatusCode);
      });
    });
    req.on('timeout', () => {
      if (settled) {
        // The socket of a request whose outcome is already delivered may idle as long as it likes; tearing
        // that one down would be about a request nobody is waiting for any more.
        return;
      }
      // `timeout` only reports the idle socket, it does not end anything - node leaves that to this listener.
      // Destroying with an error routes the silence into the handler below, so it costs a retry and ends in
      // the callback exactly like an endpoint that was never reachable. The message names neither host nor
      // path: that handler logs what it is given, and the path of a request carries its query.
      req.destroy(new Error(`HTTPS request timed out after ${HTTPSService.requestTimeoutMs} ms`));
    });
    req.on('error', (e: Error) => {
      ServerLogService.writeLog(LogLevel.DeepTrace, `HTTPS Error: ${e}`);
      if (settled) {
        return;
      }
      if (retryOnError > 0) {
        ServerLogService.writeLog(LogLevel.DeepTrace, `HTTPS request failed --> ${retryOnError} retries left`);
        // The retry inherits the callback, so this attempt is done with it from here on.
        settled = true;
        Utils.guardedTimeout(() => {
          HTTPSService.request(options, postData, retryOnError - 1, responseCallback);
        }, 100);
        return;
      }
      // Neither the request nor the error is quoted here: the path of a request carries its query, and this
      // repository is public.
      ServerLogService.writeLog(LogLevel.Error, 'HTTPS request failed after retries');
      settle(HTTPSService.failureResponse, HTTPSService.failureStatusCode);
    });
    if (postData !== '') {
      req.write(postData);
    }
    req.end();
  }

  /**
   * Downloads a file from a given url to the given location, and **settles either way**: on every way the
   * download can end - the file written, the endpoint refusing, the request failing, the answer breaking off
   * or the disk failing - the promise is resolved or rejected exactly once.
   * If the location doesn't exist, it will be created quietly.
   * @param url - URL to download file from
   * @param filePath - Path to save file to
   * @returns A promise that resolves to true once the file is written and to false when the transfer failed;
   * it is rejected when the endpoint refused the download or when the file could not be written
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
      // True as soon as the download is over, whichever way it went. Several of the ways below fire for the
      // same download - a socket error still turns up once the file has been written - and without this the
      // clean up of a failed one would take a finished file with it.
      let settled: boolean = false;
      const succeed = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(true);
      };
      /**
       * Ends a failed download: closes the write stream and removes what was written of the file before the
       * caller hears about it. A torso that stays behind is taken for a finished download the next time.
       * @param reason - What to reject with, or nothing to report the failure as `false`
       */
      const discard = (reason?: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        file.destroy();
        fs.unlink(filePath, () => (reason !== undefined ? reject(reason) : resolve(false)));
      };

      const request = HTTPS.get(url, (response: IncomingMessage) => {
        if (response.statusCode !== 200) {
          discard(new Error(`Failed to get '${url}' (${response.statusCode})`));
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
        // An answer that breaks off once it is being piped ends the download without the request failing and
        // without the file ever finishing, so it is heard here or nowhere. Same class of failure as a failing
        // socket, so it is reported the same way.
        response.on('error', (err: Error) => {
          ServerLogService.writeLog(LogLevel.DeepTrace, `Error Downloading File: ${err}`);
          discard();
        });
        response.pipe(file);
      });

      // The destination stream is ended by the time it's called
      file.on('finish', () => succeed());

      // A failing disk - no space, no permission - fails the write stream and nothing else: request and
      // answer are both fine. Without this the event goes unhandled and the caller waits for a download that
      // is already over.
      file.on('error', (err: Error) => {
        // Only the code of the failure travels on: the message of a real one quotes the file it was writing,
        // and the caller is free to log what it is handed.
        const code: string = (err as NodeJS.ErrnoException).code ?? err.name;
        ServerLogService.writeLog(LogLevel.DeepTrace, `Error writing downloaded file: ${code}`);
        discard(new Error(`Writing the downloaded file failed (${code})`));
      });

      request.on('error', (err: Error) => {
        ServerLogService.writeLog(LogLevel.DeepTrace, `Error Downloading File: ${err}`);
        discard();
      });
    });
  }

  private static defaultCallback(data: string, statuscode: number): void {
    ServerLogService.writeLog(LogLevel.DeepTrace, `Response statusCode:"${statuscode}"\nData:"${data}"`);
  }
}
