import { BlueIrisCoordinator } from '../blueIris';
import { EspresenseCoordinator } from '../espresense';

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
