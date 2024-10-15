import { Constants, DetectorPossiblePatternsEnum } from '../../../models';
import { SiplColors } from '../../colors.definition';
import { Bounds, DetectorPatternDrawer } from './detector-pattern.drawer';

const barHeight = (value: number): number => {
  if (!value) {
    return 0;
  }

  const confinedV: number = Math.max(Math.min(100, value), 0);
  return (confinedV / 100) * Constants.ROW_HEIGHT;
};

export const getDetectorPattern = (drawer: DetectorPatternDrawer) => {
  const bounds = drawer.getBounds();
  const fullBar = drawer.getBasePath();

  let { x1, x2, bottom, top } = bounds;
  const rectWidth = Constants.COLUMN_WIDTH - 2;
  const rectHeight = Constants.ROW_HEIGHT - 2;
  const dynamicBar = `M${x1} ${
    top + barHeight(drawer.value)
  } L${x1} ${bottom}L${x2} ${bottom}L${x2} ${top + barHeight(drawer.value)}`;

  switch (drawer.pattern) {
    // Black and white
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_BLUE:
      return colorPattern(dynamicBar, SiplColors.blue);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_GREEN:
      return colorPattern(dynamicBar, SiplColors.green);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_RED:
      return colorPattern(dynamicBar, SiplColors.red);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_SOLID:
      return colorPattern(fullBar, SiplColors.darkBlue);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_EMPTY:
      return emptyPatern(bounds, rectWidth, rectHeight);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_FALING:
      return falingPattern(bounds, rectWidth, rectHeight);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_RASING:
      return rasingPattern(bounds, rectWidth, rectHeight);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_VERTICAL:
      return verticalPattern(bounds, rectWidth, rectHeight);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_HORIZONTAL:
      return horizontalPattern(bounds, rectWidth, rectHeight);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_GRID:
      return gridPattern(bounds, rectWidth, rectHeight);
    default:
      return colorPattern(fullBar, SiplColors.black);
  }
};

const colorPattern = (path: string, color: SiplColors) => {
  return `<path d="${path}" style="fill: ${color}; stroke-width: 1;"></path>`;
};

const emptyPatern = (
  { x1, top }: Bounds,
  rectWidth: number,
  rectHeight: number
) => {
  return `<g>
  <rect
   x="${x1 + 1}"
    y="${top + 1}"
     width="${rectWidth}"
      height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
</g>`;
};

const falingPattern = (
  { x1, top, x2 }: Bounds,
  rectWidth: number,
  rectHeight: number
) => {
  let diagonalPath = '';
  for (let i = 0; i < 5; i++) {
    diagonalPath += `M ${x1} ${top + i * 5} L${x2} ${top + 5 + i * 5}`;
  }
  return `<g>
  <rect
     x="${x1 + 1}"
      y="${top + 1}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${diagonalPath}" style="stroke: ${
    SiplColors.darkBlue
  }; stroke-width:1"></path>
</g>`;
};

const rasingPattern = (
  { x1, top, x2 }: Bounds,
  rectWidth: number,
  rectHeight: number
) => {
  let diagonalPathRevert = '';
  for (let i = 0; i < 5; i++) {
    diagonalPathRevert += `M ${x1} ${top + 5 + i * 5} L${x2} ${top + i * 5}`;
  }
  return `<g>
  <rect
     x="${x1 + 1}"
      y="${top + 1}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${diagonalPathRevert}" style="stroke: ${
    SiplColors.darkBlue
  }; stroke-width:1"></path>
</g>`;
};

const verticalPattern = (
  { x1, top, bottom }: Bounds,
  rectWidth: number,
  rectHeight: number
) => {
  let parallel = '';
  for (let i = 0; i < 3; i++) {
    parallel += `M ${x1 + i * 3} ${top} L${x1 + i * 3} ${bottom}`;
  }
  return `<g>
  <rect
     x="${x1 + 1}"
      y="${top + 1}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${parallel}" style="stroke: ${
    SiplColors.darkBlue
  }; stroke-width:1"></path>
</g>`;
};

const horizontalPattern = (
  { x1, top, x2 }: Bounds,
  rectWidth: number,
  rectHeight: number
) => {
  let vertical = '';
  for (let i = 1; i < 5; i++) {
    let topOffset = top + i * 5;
    vertical += `M ${x1} ${topOffset} L${x2} ${topOffset}`;
  }
  return `<g>
  <rect
     x="${x1 + 1}"
      y="${top + 1}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${vertical}" style="stroke: ${
    SiplColors.darkBlue
  }; stroke-width:1"></path>
</g>`;
};

const gridPattern = (
  { x1, top, x2, bottom }: Bounds,
  rectWidth: number,
  rectHeight: number
) => {
  let verticalLines = '';
  let parallelLines = '';
  for (let i = 1; i < 5; i++) {
    let topOffset = top + i * 5;
    verticalLines += `M ${x1} ${topOffset} L${x2} ${topOffset}`;
  }

  for (let i = 0; i < 3; i++) {
    parallelLines += `M ${x1 + i * 3} ${top} L${x1 + i * 3} ${bottom}`;
  }
  return `<g>
  <rect
     x="${x1 + 1}"
      y="${top + 1}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${verticalLines}" style="stroke: ${
    SiplColors.darkBlue
  }; stroke-width:1"></path>
       <path d="${parallelLines}" style="stroke: ${
    SiplColors.darkBlue
  }; stroke-width:1"></path>
</g>`;
};
