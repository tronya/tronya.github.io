import { LinksSchema } from '../schemas/links.schema';
import { NodesSchema } from '../schemas/node.schema';
import { TrafficNetworkSchema } from '../schemas/traffic-network.schema';
import { ConfigTypes } from './ConfigurationFactory';

export enum DiffTypes {
  TrafficNetwork = 'TrafficNetwork',
  Node = 'Node',
  Link = 'Link',
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

export interface Table<TYPE> {
  name: string;
  headerKeys: string[];
  itemsCount: number;
  parentConfig: TableParentConfig<TYPE>[];
}

export abstract class TableParentConfig<TYPE> {
  constructor(
    public config: Configuration,
    public items: TYPE[],
    public type: ConfigTypes
  ) {}
}

export interface TableData {
  name: string;
  collapsed: boolean;
  loaded: boolean;
  itemsCount: number;
  notEqualKeys: number;
  rows: CompareResult[];
}

export interface ConfigurationGroup {
  collapsed: boolean;
  name: string;
  diffKeys: (DiffKey | NestedDiffKey)[];
}
export function isConfigurationGroup(value: any): value is ConfigurationGroup {
  return (
    value.hasOwnProperty('diffKeys') &&
    value.hasOwnProperty('collapsed') &&
    !value.hasOwnProperty('method') &&
    !value.hasOwnProperty('schemaRef')
  );
}

export interface ConfigurationReferance
  extends Omit<ConfigurationGroup, 'diffKeys'> {
  key: string; // refferance to key in object
  preload: boolean;
  method: {
    type: 'array';
    trackBy: string;
  }; // flag to explain if it would be an array of items
  schemaRef: Schema;
}
export function isConfigurationReferance(
  value: any
): value is ConfigurationReferance {
  return (
    value.hasOwnProperty('schemaRef') &&
    value.hasOwnProperty('key') &&
    value.hasOwnProperty('method')
  );
}

export type Configuration = ConfigurationGroup | ConfigurationReferance;

export interface Schema {
  name: string;
  headerKey: string;
  configuration: Configuration[];
}

export interface DiffItem<DiffModels> {
  item: DiffModels;
  type: DiffTypes;
}

export const DiffSchemaTypes: { [key in DiffTypes]: Schema } = {
  TrafficNetwork: TrafficNetworkSchema,
  Node: NodesSchema,
  Link: LinksSchema,
};

export type DiffProp = {
  [key: string]: any;
};

export type PossibleValuesTypes =
  | string
  | number
  | boolean
  | undefined
  | null;

export function isPossibleValuesType(value: any): value is PossibleValuesTypes {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === null ||
    typeof value === 'boolean' ||
    value === undefined
  );
}
export interface CompareResult {
  key: string;
  name: string;
  equalValues: boolean;
  values: {
    value: PossibleValuesTypes;
    equal: boolean;
  }[];
}
