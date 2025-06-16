import { SiplDiagramLabel } from '../model/label';
import { SiplTypesEnum } from '../model/label';

export const labelsMock: SiplDiagramLabel[] = [
  { name: 'SP', id: 0, type: SiplTypesEnum.NODE_STATE },
  { name: 'TX', id: 1, type: SiplTypesEnum.NODE_STATE },
  { name: 'PH', id: 2, type: SiplTypesEnum.NODE_STATE },
  { name: 'UE', id: 3, type: SiplTypesEnum.NODE_STATE },
  { name: 'PX', id: 4, type: SiplTypesEnum.NODE_STATE },
  { name: 'PT Values', id: 6, type: SiplTypesEnum.PT_VALUES },
  { name: 'A_', id: 1, type: SiplTypesEnum.SIGNAL_GROUP },
  { name: 'B_', id: 2, type: SiplTypesEnum.SIGNAL_GROUP },
  { id: 3, name: 'C_', type: SiplTypesEnum.SIGNAL_GROUP },
  { name: 'C1', id: 4, type: SiplTypesEnum.SIGNAL_GROUP },
  { name: 'D_', id: 5, type: SiplTypesEnum.SIGNAL_GROUP },
  { name: 'AnF2T', id: 12, type: SiplTypesEnum.DETECTOR },
  { name: 'AnE3T', id: 13, type: SiplTypesEnum.DETECTOR },
  { name: 'AnF3T', id: 14, type: SiplTypesEnum.DETECTOR },
  { name: 'AnE4T', id: 15, type: SiplTypesEnum.DETECTOR },
  { name: 'MAMH1b', id: 19, type: SiplTypesEnum.DETECTOR },
  { name: 'MBMH2b', id: 24, type: SiplTypesEnum.DETECTOR },
  { name: 'OT_Stumm', id: 1, type: SiplTypesEnum.OUTPUT },
  { name: 'Akustik_BS', id: 2, type: SiplTypesEnum.OUTPUT },
  { name: 'K_SD', id: 6, type: SiplTypesEnum.OUTPUT },
  { name: 'K_SC1', id: 8, type: SiplTypesEnum.OUTPUT },
];
