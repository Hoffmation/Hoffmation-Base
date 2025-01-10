import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import { LogLevel, ServerLogService } from '../../logging';
import { iMp3Settings } from '../../server';

export class MP3Server {
  /**
   * Whether this service is active
   */
  public static active: boolean = false;
  private mp3Path: string = '';

  public constructor(settings: iMp3Settings) {
    if (!settings) {
      return;
    }

    this.mp3Path = settings.path;
    MP3Server.active = true;
    http
      .createServer((req, response) => {
        if (req.url === undefined) {
          response.writeHead(500);
          response.end('ungültige Anfrage', 'utf-8');
          return;
        }
        req.on('error', (e) => {
          ServerLogService.writeLog(LogLevel.Warn, `MP3-Server HTTP Error: ${e}`);
        });
        response.on('error', (e) => {
          ServerLogService.writeLog(LogLevel.Warn, `MP3-Server HTTP Error: ${e}`);
        });
        const q = url.parse(req.url, true).query;

        const fName = q.fname;

        if (!fName || fName.indexOf('.') >= 0) {
          response.writeHead(500);
          response.end('ungültiger Dateiname', 'utf-8');
          return;
        }

        ServerLogService.writeLog(LogLevel.DeepTrace, `Anfrage für ${fName}`);
        const fPath: string = this.mp3Path + fName + '.mp3';
        try {
          if (!fs.existsSync(fPath)) {
            ServerLogService.writeLog(
              LogLevel.Error,
              `Die von ${req.socket.remoteAddress} angefragte Datei existiert nicht ${fName}`,
            );
            return;
          }
        } catch (err) {
          console.error(err);
        }

        const filestream = fs.createReadStream(fPath);
        response.writeHead(200, { 'Content-Type': 'audio/mpeg3' });
        filestream.pipe(response, { end: true });

        /*
      fs.readFile(fPath, (error, data) => {
          if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./404.html', (err, cont) => {
                    response.writeHead(200, { 'Content-Type': "audio/mpeg3" });
                    response.end(cont, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': "audio/mpeg3" });
            response.end(data, 'utf-8');
        }
      })
      */
      })
      .listen(8081);
  }
}
