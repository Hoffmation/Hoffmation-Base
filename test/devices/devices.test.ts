import {
  BaseGroup,
  DeviceCluster,
  Devices,
  GroupType,
  iDeviceConfig,
  iRoomBase,
  PresenceGroup,
  RoomBase,
  Utils,
  Window,
  WindowGroup,
} from '../../src';
import ExampleDevices from './exampleDevices.json';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew

describe('Devices', () => {
  Utils.testInitializeServices();
  jest.setTimeout(10000);
  const deviceJSON: { [id: string]: iDeviceConfig } = ExampleDevices as {
    [id: string]: iDeviceConfig;
  };
  new Devices(deviceJSON);
  it('Should be able to create device JSON', () => {
    const json: string = JSON.stringify(Devices.alLDevices);
    expect(json !== '').toBeTruthy();
    const newObject: string = JSON.parse(json);
    expect(Object.keys(newObject).length > 0).toBeTruthy();
  });
  it('Should be able to create DeviceCluster JSON', () => {
    const cluster: DeviceCluster = new DeviceCluster();
    const deviceKey: string = Object.keys(Devices.alLDevices)[0];
    cluster.addByDeviceType(Devices.alLDevices[deviceKey]);
    const json: string = JSON.stringify(cluster);
    expect(json !== '').toBeTruthy();
    const newObject: string = JSON.parse(json);
    expect(Object.keys(newObject).length > 0).toBeTruthy();
  });
  it('Should be able to create Room JSON', () => {
    const groups: Map<GroupType, BaseGroup> = new Map<GroupType, BaseGroup>();
    groups.set(GroupType.Window, new WindowGroup('Testroom', [new Window('Testroom', ['hm-rpc-0007DA49A781DF'])]));
    groups.set(GroupType.Presence, new PresenceGroup('Testroom', ['zigbee-00124b0022cd373c']));
    const room: iRoomBase = new RoomBase(groups, 'Testroom', 1);
    const json: string = JSON.stringify(room);
    expect(json !== '').toBeTruthy();
    const newObject: string = JSON.parse(json);
    expect(Object.keys(newObject).length > 0).toBeTruthy();
  });
  afterAll(() => {
    Devices.energymanager?.dispose();
  });
});
