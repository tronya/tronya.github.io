import { NodesSchema } from '../schemas/node-schema.schema';
import { TrafficNetworkSchema } from '../schemas/traffic-network.schema';

export enum DiffTypes {
  TrafficNetwork = 'TrafficNetwork',
  Nodes = 'Nodes',
}
export interface DiffKey {
  name: string;
  key: string;
}

export interface NestedDiffKey extends DiffKey {
  nested: true;
  diffKeys: DiffKey[];
}

export function isNestedDiffKey(value: any): value is NestedDiffKey {
  return value.hasOwnProperty('nested');
}

export interface Table {
  name: string;
  headerKeys: string[];
  itemsCount: number;
  data: TableData[];
}

export interface TableData {
  name: string;
  collapsed: boolean;
  group: boolean;
  rows: CompareResult[];
}

export interface DiffGroup {
  group: boolean;
  collapsed: boolean;
  name: string;
  diffKeys: (DiffKey | NestedDiffKey)[];
}

export interface DiffRef extends Omit<DiffGroup, 'diffKeys'> {
  key: string; // refferance to key in object
  method: {
    type: 'array';
    trackBy: string;
  }; // flag to explain if it would be an array of items
  schemaRef: Schema;
}
export function isDiffRef(value: any): value is DiffRef {
  return (
    value.hasOwnProperty('schemaRef') &&
    value.hasOwnProperty('key') &&
    value.hasOwnProperty('method')
  );
}

export interface Schema {
  name: string;
  headerKey: string;
  configuration: (DiffGroup | DiffRef)[];
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

export type PossibleValuesTypes = string | number | boolean | undefined | Date;
export function isPossibleValuesType(value: any): value is PossibleValuesTypes {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    value === undefined
  );
}
export interface CompareResult {
  key: string;
  name: string;
  equalAll: boolean;
  values: {
    value: PossibleValuesTypes;
    equal: boolean;
  }[];
}
