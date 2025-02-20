import { TrafficNetworkDTO } from '../service/dto';
import { linksMock } from './links';
import { nodesMock, nodesMock2 } from './nodes';

export const trafficNetwork: TrafficNetworkDTO = {
  guid: '28f392e4-ddde-4d68-90a9-9ffce7163989',
  tenantId: 'a5dddb89-3b9d-4ae5-8340-888f2d9e2dc8',
  name: 'par_test1',
  description: '',
  geoArea: null,
  rightHandTraffic: true,
  displaySpeedUnit: 0,
  displayLengthUnit: 2,
  defaultMaxSpeed: 0.0,
  identifier: '533',
  nodes: 2169,
  links: 3869,
  nodeCount: 2169,
  nodeClusterCount: 197,
  linkCount: 3869,
  externalSourceCount: {
    WINTICS: 0,
    IPER: 357,
  },
  sectionCount: 0,
  subnetworkCount: 26,
  routeCount: 269,
  nodesDTO: nodesMock,
  linksDTO: linksMock,
};

export const trafficNetwork2: TrafficNetworkDTO = {
  guid: '28f392e4-ddde-4d68-90a9-sdffsd',
  tenantId: 'a5dddb89-3b9d-4ae5-8340-888f2d9e2dc8',
  name: 'par_test12',
  description: '',
  geoArea: null,
  rightHandTraffic: true,
  displaySpeedUnit: 0,
  displayLengthUnit: 2,
  defaultMaxSpeed: 0.0,
  identifier: '533',
  nodes: 123,
  links: 4124,
  nodeCount: 2169,
  nodeClusterCount: 197,
  linkCount: 123123,
  externalSourceCount: {
    WINTICS: 2,
    IPER: 353,
  },
  sectionCount: 0,
  subnetworkCount: 26,
  routeCount: 269,
  nodesDTO: nodesMock2,
  linksDTO: [
    linksMock[0],
    linksMock[2],
    {
      ...linksMock[3],
      end: {
        name: linksMock[3].end.name,
        node: 'Whooo who are you',
      },
    },
    linksMock[4],
    linksMock[5],
    linksMock[6],
    linksMock[7],
    linksMock[8],
    linksMock[9],
    linksMock[10],
    linksMock[11],
    linksMock[12],
    linksMock[13],
  ],
};

export const trafficNetwork3 = {
  guid: '28f392e4-ddde-4d68-90a9-sd',
  tenantId: 'a5dddb89-3b9d-4ae5-8340-888f2d9e2dc8',
  name: 'par_test1243',
  description: 'This is a description',
  geoArea: null,
  rightHandTraffic: true,
  displaySpeedUnit: 0,
  displayLengthUnit: 34,
  defaultMaxSpeed: 0.0,
  identifier: '443',
  nodes: 42,
  links: 34,
  nodeCount: 444,
  nodeClusterCount: 197,
  linkCount: 234,
  externalSourceCount: {
    WINTICS: 2,
    IPER: 3343,
  },
  sectionCount: 0,
  subnetworkCount: 26,
  routeCount: 4324,
  linksDTO: linksMock,
};
