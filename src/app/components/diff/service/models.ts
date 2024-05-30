import { NodesSchema, TrafficNetworkSchema } from './schema';

export enum DiffTypes {
  TrafficNetwork = 'TrafficNetwork',
  Nodes = 'Nodes',
}
export interface DiffKeys {
  name: string;
  key: string;
  nested?: true;
  diffKeys?: DiffKeys[];
}
export interface Schema {
  schema: {
    name: string;
  };
  diffKeys: DiffKeys[];
}

export interface DiffItem<DiffModels> {
  item: DiffModels;
  type: DiffTypes;
}

export const DiffSchemaTypes: { [key in DiffTypes]: Schema } = {
  TrafficNetwork: TrafficNetworkSchema,
  Nodes: NodesSchema,
};

export type DiffProp = {
  [key: string]: any;
};

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
export interface TrafficNetworkDiff extends TrafficNetwork {
  extendedGroups: {
    nodes: Nodes[];
  };
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

export interface CompareResult {
  key: string;
  name: string;
  same: boolean;
  value: string | number | boolean;
}

export type DiffModelsTypes = TrafficNetwork | Nodes | TrafficNetworkDiff;
