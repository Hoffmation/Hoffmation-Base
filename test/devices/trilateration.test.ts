import { Trilateration, TrilaterationBasePoint, TrilaterationPoint, TrilaterationPointDistance } from '../../src';

describe('Trilateration', () => {
  const trilaterationExamplePoints: TrilaterationPoint[] = [];

  for (let x = 0; x < 10; x = x + 0.5) {
    for (let y = 0; y < 10; y = y + 0.5) {
      for (let z = 0; z < 10; z = z + 0.5) {
        addExamplePoint(z, x, y);
      }
    }
  }

  Trilateration.basePoints.push(new TrilaterationBasePoint(0, 0, 0, 'basement', 15));
  Trilateration.basePoints.push(new TrilaterationBasePoint(10, 10, 5, 'ground-floorRightTop', 15));
  Trilateration.basePoints.push(new TrilaterationBasePoint(10, 0, 5, 'ground-floorRightBottom', 15));
  Trilateration.basePoints.push(new TrilaterationBasePoint(4, 4, 10, 'first-floorLeftBottom', 15));
  Trilateration.basePoints.push(new TrilaterationBasePoint(9, 7, 8, 'first-floorRightTop', 15));
  Trilateration.possiblePoints = trilaterationExamplePoints;
  Trilateration.initialize();

  it('Should find a specific room', () => {
    const distances: TrilaterationPointDistance[] = [];
    distances.push(new TrilaterationPointDistance('0-0-0', 11));
    distances.push(new TrilaterationPointDistance('10-10-5', 8));
    distances.push(new TrilaterationPointDistance('10-0-5', 9));
    distances.push(new TrilaterationPointDistance('5-5-10', 3));
    distances.push(new TrilaterationPointDistance('9-7-8', 5));

    // const targetPoint = new TrilaterationPoint(4, 6, 8, 'First-floorLeftTop');
    // console.log(`Distance to 0-0-0: ${targetPoint.getDot5Distance(Trilateration.basePoints[0].ownPoint)}`);
    // console.log(`Distance to 10-10-5: ${targetPoint.getDot5Distance(Trilateration.basePoints[1].ownPoint)}`);
    // console.log(`Distance to 10-0-5: ${targetPoint.getDot5Distance(Trilateration.basePoints[2].ownPoint)}`);
    // console.log(`Distance to 5-5-10: ${targetPoint.getDot5Distance(Trilateration.basePoints[3].ownPoint)}`);
    // console.log(`Distance to 9-7-8: ${targetPoint.getDot5Distance(Trilateration.basePoints[4].ownPoint)}`);

    const result = Trilateration.checkRoom(distances);
    expect(result).toBe('First-floorLeftTop');
  });

  it('TrilaterationPoint.getPointsInRange, should generate some points', () => {
    const a = new TrilaterationPoint(0, 0, 0, 'test');
    const b = new TrilaterationPoint(5, 5, 2, 'test');

    const result = TrilaterationPoint.getPointsInRange(a, b, 'test');
    expect(result.length).toBe(605);
  });

  it('Should find a specific room with some deviation', () => {
    const distances: TrilaterationPointDistance[] = [];
    distances.push(new TrilaterationPointDistance('10-10-5', 8.5));
    distances.push(new TrilaterationPointDistance('10-0-5', 9.5));
    distances.push(new TrilaterationPointDistance('4-4-10', 2.5));

    const result = Trilateration.checkRoom(distances);
    expect(result).toBe('First-floorLeftTop');
  });

  it('Should find a specific room 2', () => {
    const distances: TrilaterationPointDistance[] = [];
    distances.push(new TrilaterationPointDistance('0-0-0', 5));
    distances.push(new TrilaterationPointDistance('10-10-5', 10.5));
    distances.push(new TrilaterationPointDistance('10-0-5', 9.5));
    distances.push(new TrilaterationPointDistance('4-4-10', 8));
    distances.push(new TrilaterationPointDistance('9-7-8', 9.5));

    // const targetPoint = new TrilaterationPoint(2, 4, 2, 'basement');
    // console.log(`Distance to 0-0-0: ${targetPoint.getDot5Distance(Trilateration.basePoints[0].ownPoint)}`);
    // console.log(`Distance to 10-10-5: ${targetPoint.getDot5Distance(Trilateration.basePoints[1].ownPoint)}`);
    // console.log(`Distance to 10-0-5: ${targetPoint.getDot5Distance(Trilateration.basePoints[2].ownPoint)}`);
    // console.log(`Distance to 5-5-10: ${targetPoint.getDot5Distance(Trilateration.basePoints[3].ownPoint)}`);
    // console.log(`Distance to 9-7-8: ${targetPoint.getDot5Distance(Trilateration.basePoints[4].ownPoint)}`);

    const result = Trilateration.checkRoom(distances);
    expect(result).toBe('basement');
  });

  function addExamplePoint(z: number, x: number, y: number): void {
    let roomName: string = 'unbekannt';
    if (z < 3) {
      roomName = 'basement';
    } else if (z < 6) {
      if (x < 5 && y < 5) {
        roomName = 'ground-floorLeftBottom';
      } else if (x < 5 && y >= 5) {
        roomName = 'ground-floorLeftTop';
      } else if (x >= 5 && y < 5) {
        roomName = 'ground-floorRightBottom';
      } else {
        roomName = 'ground-floorRightTop';
      }
    } else {
      if (x < 5 && y < 5) {
        roomName = 'First-floorLeftBottom';
      } else if (x < 5 && y >= 5) {
        roomName = 'First-floorLeftTop';
      } else if (x >= 5 && y < 5) {
        roomName = 'First-floorRightBottom';
      } else {
        roomName = 'First-floorRightTop';
      }
    }
    trilaterationExamplePoints.push(new TrilaterationPoint(x, y, z, roomName));
  }
});
