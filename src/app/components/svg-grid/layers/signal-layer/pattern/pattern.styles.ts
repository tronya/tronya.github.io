import {
  Constants,
  BlackAndWhitePatternsEnum,
  SignalStatePatternsExtraEnum,
  SignalStatePolychromePatternEnum,
} from '../../../models';
import { SiplColors } from '../../colors.definition';
import { PatternDrawer } from './drawer.helper';

export const getPattern = (drawer: PatternDrawer): string => {
  const basePath = drawer.getBasePath();
  const { start, end } = drawer.getRange();

  const arrowSize = 4;
  const { x1, x2, center } = drawer.getBounds();
  const width = Constants.ROW_HEIGHT / 2;
  const quarter = Constants.ROW_HEIGHT / 4;
  const topLine = center - quarter;
  const bottomLine = center + quarter;
  const patternHeight = bottomLine - topLine;

  switch (drawer.pattern) {
    // Black and ${white}
    case BlackAndWhitePatternsEnum.GREEN_BW:
      return `<path d="${basePath}" style="stroke: ${SiplColors.grey}; stroke: ${SiplColors.black}; stroke-width: 14;"></path>`;
    case BlackAndWhitePatternsEnum.AMBER_BW:
      return `<path d="M${x1} ${topLine} L ${x2} ${topLine} L${x1} ${bottomLine}z" style="stroke: ${SiplColors.black}; stroke-width: 1;fill: ${SiplColors.transparent}"></path>`;

    case BlackAndWhitePatternsEnum.AMBER_FLASH_BW:
      let leg = 1;
      let ambFlashPath = ` ${'M ' + x2 + ' ' + topLine} ${
        'L ' + x2 + ' ' + bottomLine
      } ${'M ' + x1 + ' ' + topLine} ${'L ' + x1 + ' ' + bottomLine} `;
      let x11 = x1 + 9;
      while (x11 < x2) {
        if (leg % 2 == 0) {
          ambFlashPath += `${'L ' + x11 + ' ' + bottomLine}`;
        } else {
          ambFlashPath += `${'L ' + x11 + ' ' + topLine}`;
        }
        x11 += 9;
        leg++;
      }
      if (leg % 2 == 0) {
        ambFlashPath += `${'L ' + x11 + ' ' + bottomLine}`;
      } else {
        ambFlashPath += `${'L ' + x11 + ' ' + topLine}`;
      }

      return `<path d="${ambFlashPath}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>`;

      break;
    case BlackAndWhitePatternsEnum.GREEN_FLASH_BW:
      let GRFLS = x1 + 4;
      let GREEN_FLASH_BW_PATH = `M ${x1} ${topLine} L ${x2} ${topLine}`;
      while (GRFLS < x2) {
        GREEN_FLASH_BW_PATH += `${'M ' + GRFLS + ' ' + topLine} ${
          'L ' + GRFLS + ' ' + bottomLine
        }`;
        GRFLS += 4;
      }
      return `<path d="${GREEN_FLASH_BW_PATH}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>`;

    case BlackAndWhitePatternsEnum.PAST_AND_GREEN_BW:
      const pastAndGreenArrow = `M ${x1} ${topLine}  L ${x1} ${bottomLine} L ${
        x1 + arrowSize + 2
      } ${center} Z`;
      return `<g>
      <path d="${pastAndGreenArrow}" ></path>
      <path d="${basePath}" style="stroke: ${SiplColors.grey}; stroke: ${SiplColors.black}; stroke-width: 1;"></path>
      </g>`;

    case BlackAndWhitePatternsEnum.REST_GREEN_BW:
      return `<path d="${basePath}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>`;

    case BlackAndWhitePatternsEnum.MIN_GREEN_BW:
      let minGreenPath = basePath;
      minGreenPath += `M ${x1} ${center + 7}  L ${x2} ${center + 7} `;
      return `<path d="${minGreenPath}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>`;

    case BlackAndWhitePatternsEnum.RED_AMBER_FLASH_BW:
      const RARect = {
        x: x1,
        y: center - Constants.ROW_HEIGHT * 0.25,
        width: (end - start) * Constants.COLUMN_WIDTH,
        height: Constants.ROW_HEIGHT / 2,
      };

      return `<g>
      <path d="M${x1} ${bottomLine} L${x2} ${topLine}"  style="stroke: ${SiplColors.black};"></path>
      <path d="${basePath}"  style="stroke: ${SiplColors.black}; stroke-width: 4"></path>
      <rect x='${RARect.x}'
        y='${RARect.y}'
        width='${RARect.width}'
        height='${RARect.height}'
        style='fill: none; stroke: ${SiplColors.black}; stroke-width: 1;'>
        </rect>
        </g>`;

    //extra patterns
    case SignalStatePatternsExtraEnum.SOME_COOL_PATTERN:
      let SCP_PATH = basePath;
      let SCP_Line = '';
      SCP_PATH += `M ${x1} ${center - 10} L${x1} ${center + 10}   `;
      for (let s = start; s < end; s++) {
        const xa = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const xb =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const from = center - Constants.ROW_HEIGHT * 0.25;
        const to = center + Constants.ROW_HEIGHT * 0.25;
        const dirr =
          s % 2
            ? `M ${xa} ${from} L${xb} ${to}`
            : `M ${xa} ${to} L${xb} ${from}`;
        SCP_PATH += basePath;
        SCP_Line += dirr;
      }
      SCP_Line += `M ${x2} ${center - 10} L${x2} ${center + 10}   `;
      return `<g>
      <path d="${SCP_PATH}" style="stroke: ${SiplColors.red}; stroke-width: 2;"></path>
      <path d="${SCP_Line}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>
      </g>`;
    case SignalStatePatternsExtraEnum.SOME_2_COOL_PATTERN:
      let SCP2 = '';
      SCP2 += `M ${x1} ${center - 10} L${x1} ${center + 10}   `;
      for (let s = start; s < end; s++) {
        const xa = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const xb =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const from = center - Constants.ROW_HEIGHT * 0.25;
        const to = center + Constants.ROW_HEIGHT * 0.25;
        const dirr =
          s % 2
            ? `M ${xa} ${from} L${xb} ${to}`
            : `M ${xa} ${to} L${xb} ${from}`;
        SCP2 += dirr;
      }
      SCP2 += `M ${x2} ${center - 10} L${x2} ${center + 10}   `;
      return `<path d="${SCP2}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>`;

    case SignalStatePatternsExtraEnum.SOME_3_COOL_PATTERN:
      const SCP_RECT = {
        x: x1,
        y: center - Constants.ROW_HEIGHT * 0.25,
        width: (end - start) * Constants.COLUMN_WIDTH,
        height: Constants.ROW_HEIGHT / 2,
      };

      let SCP3 = '';
      for (let s = start; s < end; s++) {
        const xa = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const xb =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const from = center - Constants.ROW_HEIGHT * 0.25;
        const to = center + Constants.ROW_HEIGHT * 0.25;
        const dirr =
          s % 2
            ? `M ${xa} ${from} L${xb} ${to}`
            : `M ${xa} ${to} L${xb} ${from}`;
        SCP3 += dirr;
      }
      return `<g>
      <path d="${SCP3}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>
      <rect
        x='${SCP_RECT.x}'
        y='${SCP_RECT.y}'
        width='${SCP_RECT.width}'
        height='${SCP_RECT.height}'
        style='fill: none; stroke: ${SiplColors.black}; stroke-width: 1;'
      ></rect>
      </g>`;

    case SignalStatePatternsExtraEnum.GREEN_AMBER_GREEN:
      return `<g>
      <path d="M ${x1} ${topLine - 1} L${x2} ${topLine - 1} L${x2} ${
        topLine + patternHeight / 3
      } L${x1} ${topLine + patternHeight / 3}Z" style="fill: ${
        SiplColors.red
      };"></path>
      <path d="M ${x1} ${topLine + patternHeight / 3} L${x2} ${
        topLine + patternHeight / 3
      } L${x2} ${bottomLine - patternHeight / 3} L${x1} ${
        bottomLine - patternHeight / 3
      }Z" style="fill: ${SiplColors.orange};"></path>
      <path d="M ${x1} ${bottomLine - patternHeight / 3} L${x2} ${
        bottomLine - patternHeight / 3
      } L${x2} ${bottomLine + 1} L${x1} ${bottomLine + 1}Z" style="fill: ${
        SiplColors.green
      };"></path>
      </g>`;
    case SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH:
      const AMBER_STRIKE = `M ${x1} ${
        center + Constants.ROW_HEIGHT * 0.25
      } L${x2} ${center - Constants.ROW_HEIGHT * 0.25}   `;
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.grey}; stroke: ${SiplColors.orange}; stroke-width: 14;"></path>
      <path d="${AMBER_STRIKE}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>
      </g>`;
    case SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH_RED:
      const AMBER_STRIKE_RED = `M ${x1} ${
        center + Constants.ROW_HEIGHT * 0.25
      } L${x2} ${center - Constants.ROW_HEIGHT * 0.25}   `;
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.grey}; stroke: ${SiplColors.orange}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 4; fill: none;"></path>
      <path d="${AMBER_STRIKE_RED}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>
      </g>`;

    case SignalStatePatternsExtraEnum.GREEN_EMPTY_GREEN:
      let GEG_PATH = '';
      const GEG_RECT = {
        x: x1,
        y: center - Constants.ROW_HEIGHT * 0.25,
        width: (end - start) * Constants.COLUMN_WIDTH,
        height: Constants.ROW_HEIGHT / 2,
      };

      for (let s = start; s < end; s++) {
        const tl = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const tr =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const bl = center - Constants.ROW_HEIGHT * 0.2;
        const br = center + Constants.ROW_HEIGHT * 0.2;
        const dirr = s % 2 ? `` : `M ${tl} ${bl} H ${tr} V ${br} H ${tl} Z `;
        GEG_PATH += dirr;
      }
      return `<g>
      <path d="${GEG_PATH}" style="stroke: ${SiplColors.lightGreen}; fill: ${SiplColors.green}; stroke-width: 1;"></path>
      <rect
        x='${GEG_RECT.x}'
        y='${GEG_RECT.y}'
        width='${GEG_RECT.width}'
        height='${GEG_RECT.height}'
        style='fill: none; stroke: ${SiplColors.black}; stroke-width: 1;'
      ></rect>
      </g>`;
    case SignalStatePatternsExtraEnum.AMBER_CHESS_TYPE:
      let ACT_PATH = '';
      for (let s = start; s < end; s++) {
        const tl = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const tr =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const ba = center - Constants.ROW_HEIGHT * 0.25;
        const bl = center;
        const br = center + Constants.ROW_HEIGHT * 0.25;
        const dirr =
          s % 2
            ? `M ${tl} ${ba} H ${tr} V ${bl} H ${tl} Z `
            : `M ${tl} ${bl} H ${tr} V ${br} H ${tl} Z `;
        ACT_PATH += dirr;
      }
      return `<path d="${ACT_PATH}" style="stroke: ${SiplColors.black}; fill: ${SiplColors.orange}; stroke-width: 1;"></path>`;

    case SignalStatePatternsExtraEnum.GREEN_EMPTY_CELL_PER_SECOND:
      let GECPS_PATH = ' ';
      for (let s = start; s < end; s++) {
        const tl = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const tr =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const ba = center - Constants.ROW_HEIGHT * 0.25;
        const br = center + Constants.ROW_HEIGHT * 0.25;
        GECPS_PATH += `M ${tl} ${ba} H ${tr} V ${br} H ${tl} Z `;
      }
      return `<path d="${GECPS_PATH}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.green}; stroke-width: 1;"></path>`;
    case SignalStatePatternsExtraEnum.RED_EMPTY_CELL_PER_SECOND:
      let RECPS_PATH = ' ';
      for (let s = start; s < end; s++) {
        const tl = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const tr =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const ba = center - Constants.ROW_HEIGHT * 0.25;
        const br = center + Constants.ROW_HEIGHT * 0.25;
        RECPS_PATH += `M ${tl} ${ba} H ${tr} V ${br} H ${tl} Z `;
      }
      return `<path d="${RECPS_PATH}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.red}; stroke-width: 1;"></path>`;
    case SignalStatePatternsExtraEnum.AMBER_EMPTY_CELL_PER_SECOND:
      let AECPS_PATH = ' ';
      for (let s = start; s < end; s++) {
        const tl = x1 + (s - start) * Constants.COLUMN_WIDTH;
        const tr =
          x1 + Constants.COLUMN_WIDTH + (s - start) * Constants.COLUMN_WIDTH;

        const ba = center - Constants.ROW_HEIGHT * 0.25;
        const br = center + Constants.ROW_HEIGHT * 0.25;
        AECPS_PATH += `M ${tl} ${ba} H ${tr} V ${br} H ${tl} Z `;
      }
      return `<path d="${AECPS_PATH}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.orange}; stroke-width: 1;"></path>`;

    case SignalStatePatternsExtraEnum.AMBER_EMPTY_CELLS:
      const AEB1 = center - Constants.ROW_HEIGHT * 0.25;
      const AEB2 = center + Constants.ROW_HEIGHT * 0.25;
      const AEC_PATH = `M ${x1} ${AEB1} H ${x2} V ${AEB2} H ${x1} Z `;
      return `<path d="${AEC_PATH}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.orange}; stroke-width: 1;"></path>`;
    case SignalStatePatternsExtraEnum.GREEN_EMPTY_CELLS:
      const GEB1 = center - Constants.ROW_HEIGHT * 0.25;
      const GEB2 = center + Constants.ROW_HEIGHT * 0.25;
      const GEC_PATH = `M ${x1} ${GEB1} H ${x2} V ${GEB2} H ${x1} Z `;
      return `<path d="${GEC_PATH}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.green}; stroke-width: 1;"></path>`;
    case SignalStatePatternsExtraEnum.RED_EMPTY_CELLS:
      const REB1 = center - Constants.ROW_HEIGHT * 0.25;
      const REB2 = center + Constants.ROW_HEIGHT * 0.25;
      const REC_PATH = `M ${x1} ${REB1} H ${x2} V ${REB2} H ${x1} Z `;
      return `<path d="${REC_PATH}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.red}; stroke-width: 1;"></path>`;

    //Symbols

    case SignalStatePolychromePatternEnum.RED_PRIVILEGE:
      const RED_PRIVILEGE_STROKE = `M ${x1} ${center - 10}  L${x2} ${
        center - 10
      } `;
      return `<g>
      <path d="${basePath}" style="stroke: rgb(199, 0, 57); stroke-width: 4;"></path>
      <path d="${RED_PRIVILEGE_STROKE}" style="fill: ${SiplColors.white}; stroke: ${SiplColors.black}; stroke-width: 1;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.PAST_END_GREEN:
      const PAST_ANG_GREEN_ARROW = `M ${x1} ${center - arrowSize}  L ${x1} ${
        center + arrowSize
      } L ${x1 + arrowSize + 2} ${center} Z`;
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.lightGreen}; stroke-width: 14;"></path>
      <path d="${PAST_ANG_GREEN_ARROW}"></path>
      </g>`;

    case SignalStatePolychromePatternEnum.RED_WITH_REQUEST:
      const RED_WITH_REQUEST_ARROW_LEG = `M ${x1} ${center + 3}  L${x1} ${
        center + arrowSize + 8
      } `;
      const RED_WITH_REQUEST_ARROW = `M ${x1 - arrowSize} ${
        center + arrowSize + 2
      }  L ${x1 + arrowSize} ${center + arrowSize + 2} L ${x1} ${center + 2} Z`;
      return `<g>
      <path d="${basePath}" style="stroke: rgb(199, 0, 57); stroke-width: 4;"></path>
      <path d="${RED_WITH_REQUEST_ARROW_LEG}" style="stroke: ${SiplColors.black}; stroke-width: 2; fill: none;"></path>
      <path d="${RED_WITH_REQUEST_ARROW}" ></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_CLEARENCE_AND_MIN:
      const RED_CLEARENCE_AND_MIN_STROKE = `M ${x1} ${
        center - arrowSize - 6
      } L${x1} ${center + arrowSize + 6}   `;
      return `<g>
      <path d="${basePath}" style="stroke: rgb(199, 0, 57); stroke-width: 4;"></path>
      <path d="${RED_CLEARENCE_AND_MIN_STROKE}" style="stroke: ${SiplColors.black}; stroke-width: 2; fill: none;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_STOP_CONFLICT_GROUPS:
      const lenght = x1 + Constants.COLUMN_WIDTH;
      const RED_STOP_CONFLICT_GROUPS_STROKE = `M ${x1} ${
        center - 10
      } L${lenght} ${center - 10}  L${lenght} ${center + arrowSize} `;
      const RED_STOP_CONFLICT_GROUPS_ARROW = `M ${lenght - arrowSize} ${
        center - 10 + arrowSize
      }  L ${lenght} ${center - 10 + arrowSize + 1 + arrowSize} L ${
        lenght + arrowSize
      } ${center - 10 + arrowSize} Z`;
      return `<g>
      <path d="${basePath}" style="stroke: rgb(199, 0, 57); stroke-width: 4;"></path>
      <path d="${RED_STOP_CONFLICT_GROUPS_STROKE}" style="stroke: ${SiplColors.black}; stroke-width: 1; fill: none;"></path>
      <path d="${RED_STOP_CONFLICT_GROUPS_ARROW}" ></path>
      </g>`;

    // Normal Standart Patters
    case SignalStatePolychromePatternEnum.UNKNOWN:
      return `<path d="${basePath}" style="stroke: grey; stroke-width: 6;"></path>`;

    case SignalStatePolychromePatternEnum.INVALID:
      return `<path d="${basePath}" style="stroke: ${SiplColors.lightGray}; stroke-width: 6;"></path>`;
    case SignalStatePolychromePatternEnum.AMBER:
      return `<path d="${basePath}" style="stroke: ${SiplColors.orange}; stroke-width: 14;"></path>`;
    case SignalStatePolychromePatternEnum.AMBER_FLASH:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.orange}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.white}; stroke-width: 2;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.AMBER_FLASH_2_HZ:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.orange}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.white}; stroke-width: 2;    stroke-dasharray: 9;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.AMBER_FLASH_OFF_ON_GREEN_FLASH_ON_OFF:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.lightGray}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 4;    stroke-dasharray: 9;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.orange}; stroke-width: 4; stroke-dashoffset:9;   stroke-dasharray: 9;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.AMBER_GREEN:
      return `<g>
      <path d="M ${x1} ${topLine - 1} L${x2} ${topLine - 1} L${x2} ${
        topLine + patternHeight / 2
      } L${x1} ${topLine + patternHeight / 2}Z" style="fill: ${
        SiplColors.orange
      };"></path>
            <path d="M ${x1} ${topLine + quarter} L${x2} ${
        topLine + quarter
      } L${x2} ${bottomLine + 1} L${x1} ${bottomLine + 1}Z" style="fill: ${
        SiplColors.green
      }"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.AMBER_GREEN_FLASH:
      return `<g>
      <path d="M ${x1} ${topLine - 1} L${x2} ${topLine - 1} L${x2} ${
        topLine + patternHeight / 2
      } L${x1} ${topLine + patternHeight / 2}Z" style="fill: ${
        SiplColors.orange
      };"></path>
            <path d="M ${x1} ${topLine + quarter} L${x2} ${
        topLine + quarter
      } L${x2} ${bottomLine + 1} L${x1} ${bottomLine + 1}Z" style="fill: ${
        SiplColors.green
      }"></path>
      <path d="${basePath}" style="stroke-width:3; stroke:${
        SiplColors.white
      }"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.DARK:
      return `<path d="${basePath}" style="stroke: ${SiplColors.black}; stroke-width: 4;"></path>`;
    case SignalStatePolychromePatternEnum.GREEN:
      return `<path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 14;"></path>`;
    case SignalStatePolychromePatternEnum.GREEN_FLASH:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.white}; stroke-width: 2;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.GREEN_FLASH_2_HZ:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.white}; stroke-width: 2; stroke-dasharray: 9;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.MIN_GREEN:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.black}; stroke-width: 2;"></path>
      </g>`;

    case SignalStatePolychromePatternEnum.RED:
      return `<path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 14;"></path>`;
    case SignalStatePolychromePatternEnum.RED_AMBER:
      return `<g>
      <path d="M ${x1} ${topLine - 1} L${x2} ${topLine - 1} L${x2} ${
        topLine + patternHeight / 2
      } L${x1} ${topLine + patternHeight / 2}Z" style="fill: ${
        SiplColors.red
      };"></path>
            <path d="M ${x1} ${topLine + quarter} L${x2} ${
        topLine + quarter
      } L${x2} ${bottomLine + 1} L${x1} ${bottomLine + 1}Z" style="fill: ${
        SiplColors.orange
      }"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_AMBER_GREEN:
      return `<g>
      <path d="M ${x1} ${topLine - 1} L${x2} ${topLine - 1} L${x2} ${
        topLine + patternHeight / 3
      } L${x1} ${topLine + patternHeight / 3}Z" style="fill: ${
        SiplColors.red
      };"></path>
      <path d="M ${x1} ${topLine + patternHeight / 3} L${x2} ${
        topLine + patternHeight / 3
      } L${x2} ${bottomLine - patternHeight / 3} L${x1} ${
        bottomLine - patternHeight / 3
      }Z" style="fill: ${SiplColors.orange};"></path>
      <path d="M ${x1} ${bottomLine - patternHeight / 3} L${x2} ${
        bottomLine - patternHeight / 3
      } L${x2} ${bottomLine + 1} L${x1} ${bottomLine + 1}Z" style="fill: ${
        SiplColors.green
      };"></path>
      </g>`;

    case SignalStatePolychromePatternEnum.RED_FLASH:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.white}; stroke-width: 2;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_FLASH_2_HZ:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.white}; stroke-width: 2; stroke-dasharray: 9;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_FLASH_OFF_ON_AMBER_FLASH_ON_OFF:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.lightGray}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 4;    stroke-dasharray: 9;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.orange}; stroke-width: 4; stroke-dashoffset:9;   stroke-dasharray: 9;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_FLASH_OFF_ON_GREEN_FLASH_ON_OFF:
      return `<g>
      <path d="${basePath}" style="stroke: ${SiplColors.lightGray}; stroke-width: 14;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 4;    stroke-dasharray: 9;"></path>
      <path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 4; stroke-dashoffset:9;   stroke-dasharray: 9;"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_GREEN:
      return `<g>
      <path d="M ${x1} ${topLine - 1} L${x2} ${topLine - 1} L${x2} ${
        topLine + patternHeight / 2
      } L${x1} ${topLine + patternHeight / 2}Z" style="fill: ${
        SiplColors.red
      };"></path>
            <path d="M ${x1} ${topLine + quarter} L${x2} ${
        topLine + quarter
      } L${x2} ${bottomLine + 1} L${x1} ${bottomLine + 1}Z" style="fill: ${
        SiplColors.green
      }"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.RED_WITH_PRIOR:
      return `<g>
      <path d="${basePath}" style="stroke: ${
        SiplColors.red
      }; stroke-width: 14;"></path>
      <path d="M ${x1} ${center + 4} L${x2} ${
        center + 4
      }" style="stroke-width: 2; stroke: ${SiplColors.black}"></path>
      </g>`;
    case SignalStatePolychromePatternEnum.REST_GREEN:
      return `<path d="${basePath}" style="stroke: ${SiplColors.green}; stroke-width: 4;"></path>`;
    case SignalStatePolychromePatternEnum.REST_RED:
      return `<path d="${basePath}" style="stroke: ${SiplColors.red}; stroke-width: 4;"></path>`;

    default:
      return `<path d="${basePath}" style="stroke: grey; stroke-width: 6;"></path>`;
  }
};
