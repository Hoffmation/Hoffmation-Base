import { iDesiredShutterPosition } from '../../interfaces';

export class DesiredShutterPosition implements iDesiredShutterPosition {
  constructor(public desiredPosition: number) {}
}
