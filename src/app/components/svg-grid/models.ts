export type SignalStatesPossiblePatterns =
  | SignalStatePolychromePatternEnum
  | SignalStatePatternsExtraEnum
  | BlackAndWhitePatternsEnum;

export enum SignalStatePatternsExtraEnum {
  SOME_COOL_PATTERN = 'SOME_COOL_PATTERN',
  SOME_2_COOL_PATTERN = 'SOME_2_COOL_PATTERN',
  SOME_3_COOL_PATTERN = 'SOME_3_COOL_PATTERN',
  GREEN_AMBER_GREEN = 'GREEN_AMBER_GREEN',
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

export const Constants = {
  ROW_HEIGHT: 24,
  COLUMN_WIDTH: 9,
  OFFSET: 5,
};

export enum SignalStateEnum {
  UNKNOWN = 'UNKNOWN',
  DARK = 'DARK',
  RED = 'RED',
  AMB = 'AMB',
  GRN = 'GRN',
  RED_AMB = 'RED_AMB',
  RED_GRN = 'RED_GRN',
  RED_AMB_GRN = 'RED_AMB_GRN',
  AMB_GRN = 'AMB_GRN',
  RED_FLASH = 'RED_FLASH',
  AMB_FLASH = 'AMB_FLASH',
  GRN_FLASH = 'GRN_FLASH',
  MIN_GRN = 'MIN_GRN',
  REST_GRN = 'REST_GRN',
  GRN_EXT = 'GRN_EXT',
  PAST_END_GRN = 'PAST_END_GRN',
  RED_CLR_AND_MIN = 'RED_CLR_AND_MIN',
  REST_RED = 'REST_RED',
  RED_REQ = 'RED_REQ',
  RED_PR = 'RED_PR',
  RED_PRIV = 'RED_PRIV',
  RED_STOP_CONF = 'RED_STOP_CONF',
  RESERVED = 'RESERVED',
  START_STOP_INT = 'START_STOP_INT',
  RED_NO_EXT_INFO = 'RED_NO_EXT_INFO',
  GRN_NO_EXT_INFO = 'GRN_NO_EXT_INFO',
  VEHICLE_CALL = 'VEHICLE_CALL',
  PED_CALL = 'PED_CALL',
  ON = 'ON',
  NEXT = 'NEXT',
}
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

export interface PatternConfig {
  mainLine: { [key: string]: string };
  arrow?: { [key: string]: string };
  stroke?: { [key: string]: string };
  extra?: { [key: string]: string };
  rect?: { [key: string]: string };
}

export const defaultFlasingStyyle = {
  stroke: 'white',
  'stroke-width': '2',
};

export const BASIC_SIGNALS = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.RED,
  SignalStatePolychromePatternEnum.GREEN,
  SignalStatePolychromePatternEnum.AMBER,
  SignalStatePolychromePatternEnum.UNKNOWN,
  SignalStatePolychromePatternEnum.INVALID,
  SignalStatePolychromePatternEnum.DARK,
  SignalStatePolychromePatternEnum.RED_WITH_PRIOR,
  SignalStatePolychromePatternEnum.REST_GREEN,
  SignalStatePolychromePatternEnum.REST_RED,
]);

export const MULTIPLE_COLORS_SIGNALS = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.RED_AMBER,
  SignalStatePolychromePatternEnum.RED_AMBER_GREEN,
  SignalStatePolychromePatternEnum.AMBER_GREEN,
  SignalStatePolychromePatternEnum.AMBER_GREEN_FLASH,
  SignalStatePolychromePatternEnum.RED_GREEN,
  SignalStatePatternsExtraEnum.GREEN_AMBER_GREEN,
]);

export const FLASHING_SIGNALS = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.AMBER_FLASH,
  SignalStatePolychromePatternEnum.RED_FLASH,
  SignalStatePolychromePatternEnum.GREEN_FLASH,
]);

export const CUSTOM_SIGNALS_WITH_LINE = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.MIN_GREEN,
]);

export const BLACK_AND_WHITE_PATTERNS = new Set<SignalStatesPossiblePatterns>([
  BlackAndWhitePatternsEnum.GREEN_BW,
  BlackAndWhitePatternsEnum.AMBER_BW,
  BlackAndWhitePatternsEnum.AMBER_FLASH_BW,
  BlackAndWhitePatternsEnum.GREEN_FLASH_BW,
  BlackAndWhitePatternsEnum.PAST_AND_GREEN_BW,
  BlackAndWhitePatternsEnum.REST_GREEN_BW,
  BlackAndWhitePatternsEnum.MIN_GREEN_BW,
  BlackAndWhitePatternsEnum.RED_AMBER_FLASH_BW,
]);

export const CUSTOM_SIGNALS_STYLES = new Set<SignalStatesPossiblePatterns>([
  SignalStatePatternsExtraEnum.SOME_COOL_PATTERN,
  SignalStatePatternsExtraEnum.SOME_2_COOL_PATTERN,
  SignalStatePatternsExtraEnum.SOME_3_COOL_PATTERN,
  SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH,
  SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH_RED,
  SignalStatePatternsExtraEnum.GREEN_EMPTY_GREEN,
  SignalStatePatternsExtraEnum.AMBER_CHESS_TYPE,
  SignalStatePatternsExtraEnum.GREEN_EMPTY_CELL_PER_SECOND,
  SignalStatePatternsExtraEnum.RED_EMPTY_CELL_PER_SECOND,
  SignalStatePatternsExtraEnum.AMBER_EMPTY_CELL_PER_SECOND,
  SignalStatePatternsExtraEnum.AMBER_EMPTY_CELLS,
  SignalStatePatternsExtraEnum.RED_EMPTY_CELLS,
  SignalStatePatternsExtraEnum.GREEN_EMPTY_CELLS,
]);

export const STATES_SYMBOL = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.RED_PRIVILEGE,
  SignalStatePolychromePatternEnum.PAST_END_GREEN,
  SignalStatePolychromePatternEnum.RED_WITH_REQUEST,
  SignalStatePolychromePatternEnum.RED_CLEARENCE_AND_MIN,
  SignalStatePolychromePatternEnum.RED_STOP_CONFLICT_GROUPS,
]);

export enum DetectorOccupationStateEnum {
  UNKNOWN = 'UNKNOWN',
  FREE = 'FREE',
  OCCU = 'OCCU',
  REQ = 'REQ',
  PERM_OCCU = 'PERM_OCCU',
  ERR = 'ERR',
}

export enum DetectorPossiblePatternsEnum {
  DETECTOR_PATTERN_RED = 'DETECTOR_PATTERN_RED',
  DETECTOR_PATTERN_GREEN = 'DETECTOR_PATTERN_GREEN',
  DETECTOR_PATTERN_BLUE = 'DETECTOR_PATTERN_BLUE',
  DETECTOR_PATTERN_SOLID = 'DETECTOR_PATTERN_SOLID',
  DETECTOR_PATTERN_EMPTY = 'DETECTOR_PATTERN_EMPTY',
  DETECTOR_PATTERN_FALING = 'DETECTOR_PATTERN_FALING',
  DETECTOR_PATTERN_RASING = 'DETECTOR_PATTERN_RASING',
  DETECTOR_PATTERN_VERTICAL = 'DETECTOR_PATTERN_VERTICAL',
  DETECTOR_PATTERN_HORIZONTAL = 'DETECTOR_PATTERN_HORIZONTAL',
  DETECTOR_PATTERN_GRID = 'DETECTOR_PATTERN_GRID',
}
