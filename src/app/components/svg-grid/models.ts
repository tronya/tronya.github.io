export type SignalStatesPossiblePatterns =
  | SignalStatePolychromePatternEnum
  | SignalStatePatternsExtraEnum
  | BlackAndWhitePatternsEnum;

export enum SignalStatePatternsExtraEnum {
  SOME_COOL_PATTERN = 'SOME_COOL_PATTERN',
  SOME_2_COOL_PATTERN = 'SOME_2_COOL_PATTERN',
  SOME_3_COOL_PATTERN = 'SOME_3_COOL_PATTERN',
  GREEN_AMBER_DREEN = 'GREEN_AMBER_DREEN',
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
  ROW_HEIGHT: 25,
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

interface PatternConfig {
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

export const SignalStatePatternsColors: Record<
  SignalStatesPossiblePatterns,
  PatternConfig | undefined
> = {
  [SignalStatePolychromePatternEnum.DARK]: {
    mainLine: {
      stroke: '#475157',
      'stroke-width': '2',
    },
  },
  [SignalStatePolychromePatternEnum.UNKNOWN]: {
    mainLine: {
      stroke: '#999',
      'stroke-width': '5',
    },
  },
  [SignalStatePolychromePatternEnum.INVALID]: {
    mainLine: {
      stroke: 'gray',
      'stroke-width': '2',
    },
  },
  [SignalStatePolychromePatternEnum.AMBER]: {
    mainLine: {
      stroke: 'orange',
      'stroke-width': '14',
    },
  },
  [SignalStatePolychromePatternEnum.AMBER_FLASH]: {
    mainLine: {
      stroke: 'orange',
      'stroke-width': '14',
    },
    stroke: defaultFlasingStyyle,
  },
  [SignalStatePolychromePatternEnum.AMBER_FLASH_2_HZ]: undefined,
  [SignalStatePolychromePatternEnum.AMBER_FLASH_OFF_ON_GREEN_FLASH_ON_OFF]:
    undefined,
  [SignalStatePolychromePatternEnum.AMBER_GREEN]: undefined,
  [SignalStatePolychromePatternEnum.AMBER_GREEN_FLASH]: {
    mainLine: {},
    stroke: defaultFlasingStyyle,
  },
  [SignalStatePolychromePatternEnum.GREEN]: {
    mainLine: {
      stroke: 'lightgreen',
      'stroke-width': '14',
    },
  },
  [SignalStatePolychromePatternEnum.GREEN_FLASH]: {
    mainLine: {
      stroke: 'lightgreen',
      'stroke-width': '14',
    },
    stroke: defaultFlasingStyyle,
  },
  [SignalStatePolychromePatternEnum.GREEN_FLASH_2_HZ]: undefined,
  [SignalStatePolychromePatternEnum.MIN_GREEN]: {
    mainLine: {
      stroke: 'lightgreen',
      'stroke-width': '14',
    },
    stroke: {
      stroke: 'black',
      'stroke-width': '2',
    },
  },
  [SignalStatePolychromePatternEnum.PAST_END_GREEN]: {
    mainLine: {
      stroke: 'lightgreen',
      'stroke-width': '14',
    },
  },
  [SignalStatePolychromePatternEnum.RED]: {
    mainLine: {
      stroke: 'red',
      'stroke-width': '4',
    },
  },
  [SignalStatePolychromePatternEnum.RED_AMBER]: undefined,
  [SignalStatePolychromePatternEnum.RED_AMBER_GREEN]: undefined,
  [SignalStatePolychromePatternEnum.RED_CLEARENCE_AND_MIN]: {
    mainLine: {
      stroke: '#9e251c',
      'stroke-width': '4',
    },
    stroke: {
      stroke: 'black',
      'stroke-width': '2',
    },
  },
  [SignalStatePolychromePatternEnum.RED_FLASH]: {
    mainLine: {
      stroke: 'red',
      'stroke-width': '6',
    },
    stroke: defaultFlasingStyyle,
  },
  [SignalStatePolychromePatternEnum.RED_FLASH_2_HZ]: undefined,
  [SignalStatePolychromePatternEnum.RED_FLASH_OFF_ON_AMBER_FLASH_ON_OFF]:
    undefined,
  [SignalStatePolychromePatternEnum.RED_FLASH_OFF_ON_GREEN_FLASH_ON_OFF]:
    undefined,
  [SignalStatePolychromePatternEnum.RED_GREEN]: undefined,
  [SignalStatePolychromePatternEnum.RED_PRIVILEGE]: {
    mainLine: {
      stroke: '#c70039',
      'stroke-width': '4',
    },
    stroke: {
      stroke: 'black',
      'stroke-width': '1',
    },
  },
  [SignalStatePolychromePatternEnum.RED_STOP_CONFLICT_GROUPS]: {
    mainLine: {
      stroke: '#c70039',
      'stroke-width': '4',
    },
    stroke: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'none',
    },
    arrow: {
      fill: 'black',
    },
  },
  [SignalStatePolychromePatternEnum.RED_WITH_PRIOR]: {
    mainLine: {
      stroke: '#c70039',
      'stroke-width': '4',
    },
  },
  [SignalStatePolychromePatternEnum.RED_WITH_REQUEST]: {
    mainLine: {
      stroke: '#c70039',
      'stroke-width': '4',
    },
    stroke: {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'none',
    },
    arrow: {
      fill: 'black',
    },
  },
  [SignalStatePolychromePatternEnum.REST_GREEN]: {
    mainLine: {
      stroke: 'lightgreen',
      'stroke-width': '14',
    },
  },
  [SignalStatePolychromePatternEnum.REST_RED]: {
    mainLine: {
      stroke: '#c70039',
      'stroke-width': '4',
    },
  },
  [SignalStatePatternsExtraEnum.SOME_COOL_PATTERN]: {
    mainLine: {},
    extra: {
      stroke: 'black',
      'stroke-width': '1',
    },
    stroke: {
      stroke: 'red',
      'stroke-width': '2',
    },
  },
  [SignalStatePatternsExtraEnum.SOME_2_COOL_PATTERN]: {
    mainLine: {},
    extra: {
      stroke: 'black',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.SOME_3_COOL_PATTERN]: {
    mainLine: {},
    extra: {
      stroke: 'black',
      'stroke-width': '1',
    },
    rect: {
      fill: 'none',
      stroke: 'black',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH]: {
    mainLine: {
      stroke: 'orange',
      'stroke-width': '14',
    },
    extra: {
      stroke: 'black',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH_RED]: {
    mainLine: {
      stroke: 'orange',
      'stroke-width': '14',
    },
    stroke: {
      stroke: 'red',
      'stroke-width': '4',
    },
    extra: {
      stroke: 'black',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.GREEN_AMBER_DREEN]: undefined,
  [SignalStatePatternsExtraEnum.GREEN_EMPTY_GREEN]: {
    mainLine: {
      stroke: 'lightgreen',
      fill: 'lightgreen',
      'stroke-width': '1',
    },
    rect: {
      fill: 'none',
      stroke: 'black',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.AMBER_CHESS_TYPE]: {
    mainLine: {
      stroke: 'black',
      fill: 'orange',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.GREEN_EMPTY_CELL_PER_SECOND]: {
    mainLine: {
      fill: 'white',
      stroke: 'limegreen',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.RED_EMPTY_CELL_PER_SECOND]: {
    mainLine: {
      fill: 'white',
      stroke: 'red',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.AMBER_EMPTY_CELL_PER_SECOND]: {
    mainLine: {
      fill: 'white',
      stroke: 'orange',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.GREEN_EMPTY_CELLS]: {
    mainLine: {
      fill: 'white',
      stroke: 'green',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.AMBER_EMPTY_CELLS]: {
    mainLine: {
      fill: 'white',
      stroke: 'orange',
      'stroke-width': '1',
    },
  },
  [SignalStatePatternsExtraEnum.RED_EMPTY_CELLS]: {
    mainLine: {
      fill: 'white',
      stroke: 'red',
      'stroke-width': '1',
    },
  },
  [BlackAndWhitePatternsEnum.GREEN_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '14',
    },
  },
  [BlackAndWhitePatternsEnum.MIN_GREEN_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'white',
    },
  },
  [BlackAndWhitePatternsEnum.REST_GREEN_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'white',
    },
  },
  [BlackAndWhitePatternsEnum.PAST_AND_GREEN_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'white',
    },
  },
  [BlackAndWhitePatternsEnum.AMBER_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'none',
    },
  },
  [BlackAndWhitePatternsEnum.GREEN_FLASH_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'none',
    },
  },
  [BlackAndWhitePatternsEnum.AMBER_FLASH_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'none',
    },
  },
  [BlackAndWhitePatternsEnum.RED_AMBER_FLASH_BW]: {
    mainLine: {
      stroke: 'black',
      'stroke-width': '1',
      fill: 'white',
    },
  },
};

export const SignalStateToPatternEnum: Record<
  SignalStateEnum,
  SignalStatesPossiblePatterns
> = {
  [SignalStateEnum.DARK]: SignalStatePolychromePatternEnum.DARK,
  [SignalStateEnum.UNKNOWN]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.RED]: SignalStatePolychromePatternEnum.RED,
  [SignalStateEnum.AMB]: SignalStatePolychromePatternEnum.AMBER,
  [SignalStateEnum.GRN]: SignalStatePolychromePatternEnum.GREEN,
  [SignalStateEnum.RED_AMB]: SignalStatePolychromePatternEnum.RED_AMBER,
  [SignalStateEnum.RED_GRN]: SignalStatePolychromePatternEnum.RED_GREEN,
  [SignalStateEnum.RED_AMB_GRN]:
    SignalStatePolychromePatternEnum.RED_AMBER_GREEN,
  [SignalStateEnum.AMB_GRN]: SignalStatePolychromePatternEnum.AMBER_GREEN,
  [SignalStateEnum.RED_FLASH]: SignalStatePolychromePatternEnum.RED_FLASH,
  [SignalStateEnum.AMB_FLASH]: SignalStatePolychromePatternEnum.AMBER_FLASH,
  [SignalStateEnum.GRN_FLASH]: SignalStatePolychromePatternEnum.GREEN_FLASH,
  [SignalStateEnum.MIN_GRN]: SignalStatePolychromePatternEnum.MIN_GREEN,
  [SignalStateEnum.REST_GRN]: SignalStatePolychromePatternEnum.REST_GREEN,
  [SignalStateEnum.GRN_EXT]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.PAST_END_GRN]:
    SignalStatePolychromePatternEnum.PAST_END_GREEN,
  [SignalStateEnum.RED_CLR_AND_MIN]:
    SignalStatePolychromePatternEnum.RED_CLEARENCE_AND_MIN,
  [SignalStateEnum.REST_RED]: SignalStatePolychromePatternEnum.REST_RED,
  [SignalStateEnum.RED_REQ]: SignalStatePolychromePatternEnum.RED_WITH_REQUEST,
  [SignalStateEnum.RED_PR]: SignalStatePolychromePatternEnum.RED_WITH_PRIOR,
  [SignalStateEnum.RED_PRIV]: SignalStatePolychromePatternEnum.RED_PRIVILEGE,
  [SignalStateEnum.RED_STOP_CONF]:
    SignalStatePolychromePatternEnum.RED_STOP_CONFLICT_GROUPS,
  [SignalStateEnum.RESERVED]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.START_STOP_INT]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.RED_NO_EXT_INFO]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.GRN_NO_EXT_INFO]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.VEHICLE_CALL]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.PED_CALL]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.ON]: SignalStatePolychromePatternEnum.UNKNOWN,
  [SignalStateEnum.NEXT]: SignalStatePolychromePatternEnum.UNKNOWN,
};

export const BASIC_SIGNALS = new Set<SignalStatesPossiblePatterns>([
  SignalStatePolychromePatternEnum.RED,
  SignalStatePolychromePatternEnum.GREEN,
  SignalStatePolychromePatternEnum.AMBER,
  SignalStatePolychromePatternEnum.UNKNOWN,
  SignalStatePolychromePatternEnum.INVALID,
  SignalStatePolychromePatternEnum.DARK,
  SignalStatePolychromePatternEnum.MIN_GREEN,
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
  SignalStatePatternsExtraEnum.GREEN_AMBER_DREEN,
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

interface TwoSignalsLayer {
  coords: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  first: PatternConfig | undefined;
  second: PatternConfig | undefined;
}

interface ThreeSignalLayer extends TwoSignalsLayer {
  third: PatternConfig | undefined;
}

export const twoSignalsLayer = ({
  coords,
  first,
  second,
}: TwoSignalsLayer): [SVGPathElement, SVGPathElement] => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const rectElementFirst = document.createElementNS(svgNS, 'path');
  const firstPath = `M ${coords.x1} ${coords.y1 - 4} L${coords.x2} ${
    coords.y2 - 4
  }`;

  rectElementFirst.setAttribute('d', firstPath);
  rectElementFirst.setAttribute('stroke', first?.mainLine['stroke'] || 'black');
  rectElementFirst.setAttribute('stroke-width', '7');
  // second

  const rectElementSecond = document.createElementNS(svgNS, 'path');
  const secondPath = `M ${coords.x1} ${coords.y1 + 3} L${coords.x2} ${
    coords.y2 + 3
  }`;

  rectElementSecond.setAttribute('d', secondPath);
  rectElementSecond.setAttribute(
    'stroke',
    second?.mainLine['stroke'] || 'black'
  );
  rectElementSecond.setAttribute('stroke-width', '7');

  return [rectElementFirst, rectElementSecond];
};

export const threeSignalLayer = ({
  coords,
  first,
  second,
  third,
}: ThreeSignalLayer): [SVGPathElement, SVGPathElement, SVGPathElement] => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const rectElementFirst = document.createElementNS(svgNS, 'path');
  const firstPath = `M ${coords.x1} ${coords.y1 - 5} L${coords.x2} ${
    coords.y2 - 5
  }`;

  rectElementFirst.setAttribute('d', firstPath);
  rectElementFirst.setAttribute('stroke', first?.mainLine['stroke'] || 'black');
  rectElementFirst.setAttribute('stroke-width', '5');
  // second

  const rectElementSecond = document.createElementNS(svgNS, 'path');
  const secondPath = `M ${coords.x1} ${coords.y1} L${coords.x2} ${coords.y2}`;

  rectElementSecond.setAttribute('d', secondPath);
  rectElementSecond.setAttribute(
    'stroke',
    second?.mainLine['stroke'] || 'black'
  );
  rectElementSecond.setAttribute('stroke-width', '5');

  //third
  const rectElementThird = document.createElementNS(svgNS, 'path');
  const thirdPath = `M ${coords.x1} ${coords.y1 + 5} L${coords.x2} ${
    coords.y2 + 5
  }`;

  rectElementThird.setAttribute('d', thirdPath);
  rectElementThird.setAttribute('stroke', third?.mainLine['stroke'] || 'black');
  rectElementThird.setAttribute('stroke-width', '5');

  return [rectElementFirst, rectElementSecond, rectElementThird];
};
