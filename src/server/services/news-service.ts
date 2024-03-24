import * as fs from 'fs';
import { Stats } from 'fs';
import { HTTPSService } from './https-service';
import { Utils } from './utils';
import { ServerLogService } from './log-service';
import { PollyService } from './Sonos';
import { SettingsService } from './settings-service';
import { LogLevel } from '../../models';
import { iNewsSettings } from '../config';
import path from 'path';
import Parser from 'rss-parser';
import { LogSource } from '../../models/logSource';
import { iSpeaker } from '../devices';
import ErrnoException = NodeJS.ErrnoException;

export class NewsService {
  /**
   * Path to the most recently downloaded news audio file
   */
  public static lastNewsAudioFile: string;

  // prefix for all downloaded files of the news service
  private static readonly newsFilePrefix: string = "news$";

  // node interval that contains the ongoing fetch cycle
  private static interval: NodeJS.Timeout | undefined;
  // interval in which rss feed is to be fetched in minutes
  private static requestInterval: number;
  // maximum file age in minutes
  private static keepMaxAge: number;
  // rss feed url that contains the news information and audio file
  private static rssUrl: string | undefined;
  // last feed item that was successfully downloaded
  private static lastFetchedPubDate: string | undefined;

  public static initialize(config?: Partial<iNewsSettings>): void {
    if (config === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, "Service disabled.", { source: LogSource.News });
      return;
    }

    NewsService.keepMaxAge = config.keepMaxAge ?? 120;
    NewsService.requestInterval = config.requestInterval ?? 30;
    NewsService.rssUrl = config.rssUrl;
    NewsService.startInterval();
  }

  /**
   * Stops the regular check for new news feed items.
   * @deprecated Use {@link stopInterval} instead
   */
  public static stopHourlyInterval(): void {
    NewsService.stopInterval();
  }

  public static startInterval(): void {
    if (NewsService.interval !== undefined) {
      clearInterval(NewsService.interval);
    }

    NewsService.interval = Utils.guardedInterval(
      () => {
        NewsService.getLatestNews();
      },
      (NewsService.requestInterval ?? 30) * 60 * 1000,
      undefined,
      true,
    );
  }

  /**
   * Stops the regular check for new news feed items.
   */
  public static stopInterval(): void {
    if (NewsService.interval === undefined) {
      return;
    }

    clearInterval(NewsService.interval);
    NewsService.interval = undefined;
  }

  /**
   * Checks if there are newer news than the one currently available on disk and downloads the file for playing.
   */
  public static getLatestNews(): void {
    if (SettingsService.settings.mp3Server === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, "Not checking for newest news file, no download directory defined.", {
        source: LogSource.News,
      });
      return;
    }

    NewsService.cleanOldFiles(SettingsService.settings.mp3Server.path, NewsService.keepMaxAge);

    if (NewsService.rssUrl === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, "No rss feed set, not searching for new news.", {
        source: LogSource.News,
      });
      return;
    }

    NewsService.downloadLatestFileFromFeed(NewsService.rssUrl, SettingsService.settings.mp3Server.path);
  }

  /**
   * Plays the latest news on a sonos device
   * @param speaker - Sonos device to play from
   * @param volume - volume to play at
   * @param retries - Number of times playing should be tried if there is currently no audio file available
   */
  public static playLastNews(speaker: iSpeaker, volume: number = 30, retries: number = 5): void {
    if (!NewsService.lastNewsAudioFile) {
      if (retries > 0) {
        ServerLogService.writeLog(LogLevel.Warn, `Service not ready yet --> waiting, remaining tries: ${retries - 1}`, {
          source: LogSource.News,
        });
        Utils.guardedTimeout(() => {
          NewsService.playLastNews(speaker, volume, retries - 1);
        }, 1000);
      } else {
        ServerLogService.writeLog(LogLevel.Error, "Service not ready despite waiting --> Abort.", {
          source: LogSource.News,
        });
      }
      return;
    }

    speaker.playOnDevice(
      path.basename(NewsService.lastNewsAudioFile, path.extname(NewsService.lastNewsAudioFile)),
      PollyService.getDuration(NewsService.lastNewsAudioFile),
      volume,
    );
  }

  private static downloadLatestFileFromFeed(rssUrl: string, targetDir: string) {
    const parser = new Parser();

    parser
      .parseURL(rssUrl)
      .then((feed) => {
        try {
          const currentFeedItem = feed.items[0];

          ServerLogService.writeLog(LogLevel.Debug, `Most recent news on ${feed.title} is "${currentFeedItem.title}"`);

          if (currentFeedItem.enclosure === undefined) {
            ServerLogService.writeLog(LogLevel.Warn, "Couldn't find audio in last item of the rss feed.", {
              source: LogSource.News,
            });
            return;
          }

          const filePath = path.join(
            targetDir,
            `${NewsService.newsFilePrefix}${path.basename(currentFeedItem.enclosure.url)}`,
          );

          // check for both path and pubdate in case the file name is always the same one
          if (fs.existsSync(filePath) && NewsService.lastFetchedPubDate == currentFeedItem.pubDate) {
            NewsService.lastNewsAudioFile = path.basename(filePath);
            ServerLogService.writeLog(LogLevel.Debug, "Newest file already downloaded.", { source: LogSource.News });
            return;
          }

          ServerLogService.writeLog(LogLevel.Debug, `Current news download Link: "${currentFeedItem.enclosure.url}"`);
          HTTPSService.downloadFile(currentFeedItem.enclosure.url, filePath)
            .then((success: boolean) => {
              if (!success) {
                ServerLogService.writeLog(LogLevel.Debug, "Error while downloading audio file.", {
                  source: LogSource.News,
                });
                return;
              }

              NewsService.lastNewsAudioFile = path.basename(filePath);
            })
            .catch((reason: Error) => {
              ServerLogService.writeLog(LogLevel.Error, `Error while downloading feed audio: ${reason.message}`, {
                source: LogSource.News,
              });
            });
        } catch (e) {
          ServerLogService.writeLog(LogLevel.Debug, `Error while parsing feed: ${e}`, { source: LogSource.News });
        }
      })
      .catch((e) => {
        ServerLogService.writeLog(LogLevel.Debug, `Error while getting feed: ${e}`, { source: LogSource.News });
      });
  }

  /**
   * Deletes all files in the given directory that are older than the given age.
   * @param rootDir - Directory to search in
   * @param keepMaxAge - Maximum age in minutes until a file gets deleted
   */
  private static cleanOldFiles(rootDir: string, keepMaxAge: number): void {
    let deleteCount: number = 0;

    fs.readdir(rootDir, (err: ErrnoException | null, files: string[]) => {
      if (err) return;

      files.forEach((file: string) => {
        // only delete files from this service
        if (!file.startsWith(NewsService.newsFilePrefix)) {
          return;
        }
        fs.stat(path.join(rootDir, file), (err: ErrnoException | null, stat: Stats) => {
          if (err) return;

          const now = new Date().getTime();
          const maxSurvivingTime = new Date(stat.ctime).getTime() + keepMaxAge * 60 * 1000;
          if (now <= maxSurvivingTime) {
            return;
          }

          fs.unlink(path.join(rootDir, file), (err) => {
            if (err) {
              return console.error(err);
            }

            deleteCount++;
          });
        });
      });
    });

    if (deleteCount > 0) {
      ServerLogService.writeLog(LogLevel.Info, `Deleted ${deleteCount} old file/s.`, { source: LogSource.News });
    }
  }
}
