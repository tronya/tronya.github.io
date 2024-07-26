import { Schema } from '../service/models';

export const LinksSchema: Schema = {
  name: 'Links Schema',
  headerKey: 'name',
  configuration: [
    {
      collapsed: false,
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
          name: 'Name',
          key: 'name',
        },
        {
          nested: true,
          name: 'Start',
          key: 'start',
          diffKeys: [
            {
              name: 'Name',
              key: 'name',
            },
            {
              name: 'Node',
              key: 'node',
            },
          ],
        },
        {
          nested: true,
          name: 'End',
          key: 'end',
          diffKeys: [
            {
              name: 'Name',
              key: 'name',
            },
            {
              name: 'Node',
              key: 'node',
            },
          ],
        },
        {
          nested: true,
          name: 'TmsProperties',
          key: 'tmsProperties',
          diffKeys: [
            {
              name: 'Lane Count',
              key: 'laneCount',
            },
            {
              name: 'Coefficient',
              key: 'coefficient',
            },
            {
              name: 'Max Speed',
              key: 'maxSpeed',
            },
            {
              name: 'Length',
              key: 'length',
            },
          ],
        },
        {
          name: 'Guid',
          key: 'blocked',
        },
        {
          name: 'Network',
          key: 'category',
        },
        {
          name: 'Name',
          key: 'additionalType',
        },
        {
          name: 'Guid',
          key: 'identifier',
        },
        {
          name: 'Network',
          key: 'externalSource',
        },
        {
          name: 'Name',
          key: 'stateForMap',
        },
        {
          name: 'Name',
          key: 'timestamp',
        },
      ],
    },
  ],
};
