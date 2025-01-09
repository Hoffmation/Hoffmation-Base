import { EspresenseCoordinator } from '../espresense/index.js';
import { BlueIrisCoordinator } from '../blueIris/index.js';

export class MqttCoordinator {
  public static update(idSplit: string[], state: ioBroker.State) {
    switch (idSplit[2]) {
      case 'espresense':
        EspresenseCoordinator.update(idSplit, state);
        break;
      case 'BlueIris':
        BlueIrisCoordinator.update(idSplit, state);
        break;
    }
  }
}
