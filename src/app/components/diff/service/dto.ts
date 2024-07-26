export interface TrafficNetworkDTO {
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
  //
  nodesDTO?: NodesDTO[];
  linksDTO?: LinkDTO[];
}

export interface NodesDTO {
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

interface ProjectProjection {
  projection: string;
  lon: number;
  lat: number;
}

interface TMSProperties {
  referenceLinks: [];
  laneCount: number | null;
  coefficient: number | null;
  maxSpeed: number | null;
  length: number | null;
  tlcDetectors: any[];
}
export interface LinkDTO {
  guid: string;
  network: string;
  name: string;
  start: {
    name: string;
    node: string;
  };
  end: {
    name: string;
    node: string;
  };
  tmsProperties: TMSProperties;
  geometry: {
    projection: string;
    points: ProjectProjection[];
  };
  blocked: boolean;
  category: number;
  additionalType: null;
  identifier: string;
  externalSource: string;
  stateForMap: string;
  timestamp: string;
}

export type DiffModelsTypes = TrafficNetworkDTO | NodesDTO | LinkDTO;
