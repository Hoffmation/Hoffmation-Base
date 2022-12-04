export interface iNewsSettings {
  // rss feed url that contains the news information and audio file
  rssUrl?: string;
  // request interval in minutes
  requestInterval?: number;
  // maximum age in minutes of files cached for playback before they get deleted
  keepMaxAge?: number;
}
