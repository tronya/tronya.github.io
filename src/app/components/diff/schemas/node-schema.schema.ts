import { Schema } from '../service/models';

export const NodesSchema: Schema = {
  name: 'Nodes Schema',
  headerKey: 'name',
  configuration: [
    {
      group: true,
      expanded: true,
      name: 'Generic Information',
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
    },
  ],
};
