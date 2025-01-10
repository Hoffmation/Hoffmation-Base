import { iButtonCallback } from '../../interfaces';

export class ButtonCallback implements iButtonCallback {
  public constructor(
    readonly cb: (pValue: boolean) => void,
    readonly description: string,
  ) {}
}
