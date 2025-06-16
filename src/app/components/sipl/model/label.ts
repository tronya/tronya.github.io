export interface SiplDiagramLabel {
  id: number;
  name: string;
  type: SiplTypesEnum;
}
export enum SiplTypesEnum {
  SIGNAL_GROUP = 'signalGroup',
  DETECTOR = 'detector',
  NODE_STATE = 'nodeState',
  OUTPUT = 'output',
  DET_CHAIN = 'detChain',
  PT_VALUES = 'ptValues',
  AP_VALUES_NAMES = 'apValues',
  PARAMETER = 'parameter',
  PARAMETER_TX = 'parameter-tx',
}

export type SIPL_STATIC_LABELS = 'SP' | 'TX' | 'PH' | 'UE' | 'PX';

export class Constants {
  public static readonly DRAW_BATCH: number = 500;
  public static readonly ROW_HEIGHT: number = 25;
  public static readonly COLUMN_WIDTH: number = 9;

  public static readonly CHART_LEFT_OFFSET: number = 130;
  public static readonly CHART_TOP_OFFSET: number = 70;
  public static readonly CHART_RIGHT_OFFSET: number = 20;
  public static readonly CHART_BOTTOM_OFFSET: number = 20;

  public static readonly GRID_SMALL_OVERHANG: number = 15;
  public static readonly GRID_LARGE_OVERHANG: number = 30;

  public static readonly PARAM_HEIGHT: number = Constants.ROW_HEIGHT - 4;

  public static readonly LABEL_TOP_OFFSET: number = 20;
  public static readonly LABEL_LEFT_OFFSET: number = 10;

  public static readonly LINE_ACCUMULATED: number = 10;
  public static readonly LABEL_ACCUMULATED: number = 20;

  public static readonly GREEN_LIGHT_LABEL_OFFSET: number = 3;
  public static readonly GREEN_LIGHT_END_LIMIT: number = 4;
  public static readonly GREEN_LIGHT_LENGTH_LIMIT: number = 8;

  public static readonly PLAY_COLUMN_LIMIT: number =
    10 * Constants.COLUMN_WIDTH;

  public static readonly MAXIMUM_DETECTOR_PEAK = 100; // percent
  public static readonly MINIMUM_DETECTOR_PEAK = 20; // percent

  public static readonly PATTERN_OFFSET = 5; // Pattern offset

  public static readonly STATIC_LABELS = new Set<SIPL_STATIC_LABELS>([
    'SP',
    'TX',
    'PH',
    'UE',
    'PX',
  ]);

  public static readonly PT_VALUES_LABEL = 'PT Values';
}
export enum SignalStatePatternsExtraEnum {
  SOME_COOL_PATTERN = 'SOME_COOL_PATTERN',
  SOME_2_COOL_PATTERN = 'SOME_2_COOL_PATTERN',
  SOME_3_COOL_PATTERN = 'SOME_3_COOL_PATTERN',
  AMBER_STRIKE_THROUGH = 'AMBER_STRIKE_THROUGH',
  AMBER_STRIKE_THROUGH_RED = 'AMBER_STRIKE_THROUGH_RED',
  GREEN_EMPTY_GREEN = 'GREEN_EMPTY_GREEN',
  AMBER_CHESS_TYPE = 'AMBER_CHESS_TYPE',
  GREEN_EMPTY_CELL_PER_SECOND = 'GREEN_EMPTY_CELL_PER_SECOND',
  RED_EMPTY_CELL_PER_SECOND = 'RED_EMPTY_CELL_PER_SECOND',
  AMBER_EMPTY_CELL_PER_SECOND = 'AMBER_EMPTY_CELL_PER_SECOND',
  AMBER_EMPTY_CELLS = 'AMBER_EMPTY_CELLS',
  GREEN_EMPTY_CELLS = 'GREEN_EMPTY_CELLS',
  RED_EMPTY_CELLS = 'RED_EMPTY_CELLS',
  GREEN_AMBER_GREEN = 'GREEN_AMBER_GREEN',
}

export enum BlackAndWhitePatternsEnum {
  GREEN_BW = 'GREEN_BW',
  MIN_GREEN_BW = 'MIN_GREEN_BW',
  REST_GREEN_BW = 'REST_GREEN_BW',
  PAST_AND_GREEN_BW = 'PAST_AND_GREEN_BW',
  AMBER_BW = 'AMBER_BW',
  GREEN_FLASH_BW = 'GREEN_FLASH_BW',
  AMBER_FLASH_BW = 'AMBER_FLASH_BW',
  RED_AMBER_FLASH_BW = 'RED_AMBER_FLASH_BW',
}

export type SignalStatesPossiblePatterns =
  | SignalStatePolychromePatternEnum
  | SignalStatePatternsExtraEnum
  | BlackAndWhitePatternsEnum;

export enum SignalStatePolychromePatternEnum {
  UNKNOWN = 'UNKNOWN',
  INVALID = 'INVALID',
  AMBER = 'AMBER',
  AMBER_FLASH = 'AMBER_FLASH',
  AMBER_FLASH_2_HZ = 'AMBER_FLASH_2_HZ',
  AMBER_FLASH_OFF_ON_GREEN_FLASH_ON_OFF = 'AMBER_FLASH_OFF_ON_GREEN_FLASH_ON_OFF',
  AMBER_GREEN = 'AMBER_GREEN',
  AMBER_GREEN_FLASH = 'AMBER_GREEN_FLASH',
  DARK = 'DARK',
  GREEN = 'GREEN',
  GREEN_FLASH = 'GREEN_FLASH',
  GREEN_FLASH_2_HZ = 'GREEN_FLASH_2_HZ',
  MIN_GREEN = 'MIN_GREEN',
  PAST_END_GREEN = 'PAST_END_GREEN',
  RED = 'RED',
  RED_AMBER = 'RED_AMBER',
  RED_AMBER_GREEN = 'RED_AMBER_GREEN',
  RED_CLEARENCE_AND_MIN = 'RED_CLEARENCE_AND_MIN',
  RED_FLASH = 'RED_FLASH',
  RED_FLASH_2_HZ = 'RED_FLASH_2_HZ',
  RED_FLASH_OFF_ON_AMBER_FLASH_ON_OFF = 'RED_FLASH_OFF_ON_AMBER_FLASH_ON_OFF',
  RED_FLASH_OFF_ON_GREEN_FLASH_ON_OFF = 'RED_FLASH_OFF_ON_GREEN_FLASH_ON_OFF',
  RED_GREEN = 'RED_GREEN',
  RED_PRIVILEGE = 'RED_PRIVILEGE',
  RED_STOP_CONFLICT_GROUPS = 'RED_STOP_CONFLICT_GROUPS',
  RED_WITH_PRIOR = 'RED_WITH_PRIOR',
  RED_WITH_REQUEST = 'RED_WITH_REQUEST',
  REST_GREEN = 'REST_GREEN',
  REST_RED = 'REST_RED',
}
const STATES_SYMBOL = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.PAST_END_GREEN,
  SignalStatePolychromePatternEnum.RED_WITH_REQUEST,
  SignalStatePolychromePatternEnum.RED_CLEARENCE_AND_MIN,
  SignalStatePolychromePatternEnum.RED_STOP_CONFLICT_GROUPS,
]);

export interface Label {
  x?: number;
  y?: number;
  anchor?: string;
  fill?: string;
  fontSize?: string;
  value?: string | number;
  rotateText?: boolean;
}
