export class TrilaterationRatedCoordinate {
  constructor(
    public coordinateName: string,
    public rating: number,
    public matchCount: number = 1,
  ) {}
}
