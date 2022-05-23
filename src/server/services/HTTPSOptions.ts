import { ServerLogService } from './log-service';
import { LogLevel } from '../../models';

export class HTTPSOptions {
  constructor(
    public hostname: string,
    public path: string,
    public headers: { [id: string]: string } = {},
    public method: string = 'POST',
    public port: number = 443,
  ) {
    ServerLogService.writeLog(LogLevel.Debug, `${method} Request at '${hostname}' for '${path}'`);
  }
}
