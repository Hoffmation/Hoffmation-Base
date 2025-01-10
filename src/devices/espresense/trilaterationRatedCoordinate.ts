import { iTrilaterationRatedCoordinate } from '../../interfaces/iTrilaterationRatedCoordinate';

export class TrilaterationRatedCoordinate implements iTrilaterationRatedCoordinate {
  constructor(
    public coordinateName: string,
    public rating: number,
    public matchCount: number = 1,
  ) {}
}
