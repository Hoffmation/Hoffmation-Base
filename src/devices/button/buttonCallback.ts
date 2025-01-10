import { iButtonCallback } from '../../interfaces/iButtonCallback';

export class ButtonCallback implements iButtonCallback {
  public constructor(
    readonly cb: (pValue: boolean) => void,
    readonly description: string,
  ) {}
}
