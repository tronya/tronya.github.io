import { Schema } from '../service/models';
import { LinksSchema } from './links.schema';
import { NodesSchema } from './node.schema';

export const TrafficNetworkSchema: Schema = {
  name: 'Traffic Network',
  headerKey: 'name',
  configuration: [
    {
      collapsed: true,
      name: 'Generic Information',
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
      ],
    },
    // {
    //   collapsed: true,
    //   name: 'Link Information',
    //   preload: true,
    //   key: 'linksDTO',
    //   method: {
    //     type: 'array',
    //     trackBy: 'guid',
    //   },
    //   schemaRef: LinksSchema,
    // },
    // {
    //   collapsed: true,
    //   name: 'Nodes Information',
    //   preload: false,
    //   key: 'nodesDTO',
    //   method: {
    //     type: 'array',
    //     trackBy: 'guid',
    //   },
    //   schemaRef: NodesSchema,
    // },
    {
      name: 'First level items',
      collapsed: true,
      diffKeys: [
        {
          name: 'Nodes Count',
          key: 'nodes',
        },
        {
          name: 'Link Count',
          key: 'linkCount',
        },
      ],
    },
  ],
};
