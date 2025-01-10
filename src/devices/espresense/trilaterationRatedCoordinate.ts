import { iTrilaterationRatedCoordinate } from '../../interfaces';

export class TrilaterationRatedCoordinate implements iTrilaterationRatedCoordinate {
  constructor(
    public coordinateName: string,
    public rating: number,
    public matchCount: number = 1,
  ) {}
}
