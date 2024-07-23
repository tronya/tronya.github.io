export interface TrafficNetwork {
  guid: string;
  tenantId: string;
  name: string;
  description: string;
  geoArea: null;
  rightHandTraffic: boolean;
  displaySpeedUnit: number;
  displayLengthUnit: number;
  defaultMaxSpeed: number;
  nodes: number;
  links: number;
  nodeCount: number;
  nodeClusterCount: number;
  linkCount: number;
  identifier: string;
  externalSourceCount: {
    WINTICS: number;
    IPER: number;
  };
  sectionCount: number;
  subnetworkCount: number;
  routeCount: number;
}

export interface Nodes {
  guid: string;
  network: string;
  location: {
    projection: string;
    lon: number;
    lat: number;
  };
  type: number;
  name: string;
  comment: string | null;
  nodeTmsProperties: {
    tlcId: string | null;
    tlcNodeId: string | null;
    tlcSubNodeId: string | null;
  };
  identifier: string;
}

export type DiffModelsTypes = TrafficNetwork | Nodes;
