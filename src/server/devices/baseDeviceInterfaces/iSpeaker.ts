import { IBaseDevice } from './iBaseDevice';

export interface ISpeaker extends IBaseDevice {
  playOnDevice(
    mp3Name: string,
    duration: number,
    volume?: number,
    onlyWhenPlaying?: boolean,
    resolveAfterRevert?: boolean,
  ): void;

  playTestMessage(): void;

  playUrl(url: string): void;

  stop(): void;

  speakOnDevice(pMessage: string, volume?: number, onlyWhenPlaying?: boolean, resolveAfterRevert?: boolean): void;
}
