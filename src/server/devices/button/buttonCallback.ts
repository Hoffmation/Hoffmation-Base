export class ButtonCallback {
  public constructor(
    public readonly cb: (pValue: boolean) => void,
    public readonly description: string,
  ) {}
}
