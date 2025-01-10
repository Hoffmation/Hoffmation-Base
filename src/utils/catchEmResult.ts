export class CatchEmResult<T> {
  public constructor(
    public reason: Error | null,
    public data: T | null,
  ) {}
}
