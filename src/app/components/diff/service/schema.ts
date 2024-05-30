import { Schema } from './models';

export const TrafficNetworkSchema: Schema = {
  schema: {
    name: 'Traffic Network',
  },
  diffKeys: [
    {
      name: 'Guid',
      key: 'guid',
    },
    {
      name: 'Tenant ID',
      key: 'tenantId',
    },
    {
      name: 'Name',
      key: 'name',
    },
    {
      name: 'Description',
      key: 'description',
    },
    {
      name: 'Right Hand Traffic',
      key: 'rightHandTraffic',
    },
    {
      name: 'Display Speed Unit',
      key: 'displaySpeedUnit',
    },
    {
      name: 'Default Max Speed',
      key: 'defaultMaxSpeed',
    },
    {
      name: 'Identifier',
      key: 'identifier',
    },
    {
      name: 'Nodes',
      key: 'nodes',
    },
    {
      name: 'Links',
      key: 'links',
    },
    {
      name: 'Node Count',
      key: 'nodeCount',
    },
    {
      name: 'Node Cluster Count',
      key: 'nodeClusterCount',
    },
    {
      name: 'Link Count',
      key: 'linkCount',
    },
    {
      nested: true,
      name: 'External Source Count',
      key: 'externalSourceCount',
      diffKeys: [
        {
          name: 'WINTICS',
          key: 'WINTICS',
        },
        {
          name: 'IPER',
          key: 'IPER',
        },
      ],
    },
    {
      name: 'Section Count',
      key: 'sectionCount',
    },
    {
      name: 'Subnetwork Count',
      key: 'subnetworkCount',
    },
    {
      name: 'Route Count',
      key: 'routeCount',
    },
    {
      key: "extendedGroups",
      name: "ExtendedGroups",

    }
  ],
};

export const NodesSchema: Schema = {
  schema: {
    name: 'Nodes Schema',
  },
  diffKeys: [
    {
      name: 'Guid',
      key: 'guid',
    },
    {
      name: 'Network',
      key: 'network',
    },
    {
      nested: true,
      name: 'Location',
      key: 'location',
      diffKeys: [
        {
          name: 'Projection',
          key: 'projection',
        },
        {
          name: 'Lon',
          key: 'lon',
        },
        {
          name: 'Lan',
          key: 'lat',
        },
      ],
    },
    {
      name: 'Type',
      key: 'type',
    },
    {
      name: 'Name',
      key: 'name',
    },
    {
      name: 'Comment',
      key: 'comment',
    },
    {
      nested: true,
      name: 'nodeTmsProperties',
      key: 'nodeTmsProperties',
      diffKeys: [
        {
          name: 'Tlc Id',
          key: 'tlcId',
        },
        {
          name: 'Tlc Node Id',
          key: 'tlcNodeId',
        },
        {
          name: 'Tlc SubNode Id',
          key: 'tlcSubNodeId',
        },
      ],
    },
    {
      name: 'Identifier',
      key: 'identifier',
    },
  ],
};
