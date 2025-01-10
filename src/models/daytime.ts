import { iDaytime } from '../interfaces';

export class Daytime implements iDaytime {
  public constructor(
    public hour: number,
    public minute: number = 0,
  ) {}
}
