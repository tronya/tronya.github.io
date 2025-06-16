import { Constants, DetectorPossiblePatternsEnum } from '../../../models';
import { SiplColors } from '../../colors.definition';
import { Bounds, DetectorPatternDrawer } from './detector-pattern.drawer';

const barHeight = (value: number): number => {
  if (!value) {
    return 0;
  }

  const confinedV: number = Math.max(Math.min(100, value), 15);
  return (
    (confinedV / 100) *
    (Constants.ROW_HEIGHT - Constants.DETECTOR_MAX_BAR_HEIGHT_GAP)
  );
};

export const getDetectorPattern = (drawer: DetectorPatternDrawer): string => {
  switch (drawer.pattern) {
    // Black and white
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR:
      return colorPattern(drawer);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_SOLID:
      return solidPattern(drawer, SiplColors.darkBlue);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_BORDERED:
      return borderedPattern(drawer);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_EMPTY:
      return "";
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_FALING:
      return falingPattern(drawer);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_RASING:
      return rasingPattern(drawer);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_VERTICAL:
      return verticalPattern(drawer);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_HORIZONTAL:
      return horizontalPattern(drawer);
    case DetectorPossiblePatternsEnum.DETECTOR_PATTERN_GRID:
      return gridPattern(drawer);
    default:
      return colorPattern(drawer);
  }
};

const colorPattern = (drawer: DetectorPatternDrawer): string => {
  const { x1, x2, top, bottom } = drawer.getBounds();
  const dynamicValue = barHeight(drawer.value);
  const barTop =
    top +
    (Constants.ROW_HEIGHT -
      Constants.DETECTOR_MAX_BAR_HEIGHT_GAP -
      dynamicValue);
  const path = `M${x1} ${barTop} L${x1} ${bottom}L${x2} ${bottom}L${x2} ${barTop}Z `;
  return `<path d="${path}" style="fill: ${drawer.color}; stroke-width: 1; stroke:color-mix(in srgb,${drawer.color} 60%, black)"></path>`;
};

const solidPattern = (
  drawer: DetectorPatternDrawer,
  color: SiplColors
): string => {
  const { x1, x2, top, bottom } = drawer.getBounds();
  const path = `M ${x1} ${top} L${x2} ${top} L${x2} ${bottom} L${x1} ${bottom} Z`;
  return `<path d="${path}" style="fill: ${color}; stroke-width: 1; stroke:${color};"></path>`;
};

const borderedPattern = (drawer: DetectorPatternDrawer): string => {
  const { x1, top } = drawer.getBounds();
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  return `<g>
    <rect
     x="${x1}"
      y="${top}"
       width="${rectWidth}"
        height="${rectHeight}"
         style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
         ></rect>
  </g>`;
};

const emptyPatern = (drawer: DetectorPatternDrawer) => {
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  const { x1, top } = drawer.getBounds();
  return `<g>
  <rect
   x="${x1}"
    y="${top}"
     width="${rectWidth}"
      height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
</g>`;
};

const falingPattern = (drawer: DetectorPatternDrawer) => {
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  const { x1, x2, top } = drawer.getBounds();
  let diagonalPath = '';
  const countOfLines = 3;
  const lineShift = rectHeight / countOfLines;
  for (let i = 0; i < countOfLines; i++) {
    diagonalPath += `M ${x1} ${top + 2 + i * lineShift} L${x2} ${
      top - 2 + lineShift + i * lineShift
    }`;
  }
  return `<g>
  <rect
     x="${x1}"
      y="${top}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${diagonalPath}" style="stroke: ${SiplColors.darkBlue}; stroke-width:1"></path>
</g>`;
};

const rasingPattern = (drawer: DetectorPatternDrawer) => {
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  const { x1, x2, top } = drawer.getBounds();
  let diagonalPathRevert = '';
  const countOfLines = 3;
  const lineShift = rectHeight / countOfLines;
  for (let i = 0; i < countOfLines; i++) {
    diagonalPathRevert += `M ${x1} ${
      top - 2 + lineShift + i * lineShift
    } L${x2} ${top + 2 + i * lineShift}`;
  }
  return `<g>
  <rect
     x="${x1}"
      y="${top}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${diagonalPathRevert}" style="stroke: ${SiplColors.darkBlue}; stroke-width:1"></path>
</g>`;
};

const verticalPattern = (drawer: DetectorPatternDrawer) => {
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  const { x1, top, bottom } = drawer.getBounds();
  let parallel = '';
  const countOfCells = Math.round(rectWidth / Constants.COLUMN_WIDTH);
  for (let i = 0; i < countOfCells; i++) {
    parallel += `M ${
      x1 + i * Constants.COLUMN_WIDTH + Constants.COLUMN_WIDTH / 2
    } ${top} L${
      x1 + i * Constants.COLUMN_WIDTH + Constants.COLUMN_WIDTH / 2
    } ${bottom}`;
  }
  return `<g>
  <rect
     x="${x1}"
      y="${top}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${parallel}" style="stroke: ${SiplColors.darkBlue}; stroke-width:1"></path>
</g>`;
};

const horizontalPattern = (drawer: DetectorPatternDrawer) => {
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  const { x1, x2, top } = drawer.getBounds();
  let vertical = '';
  const linesCount = 5;
  for (let i = 1; i < linesCount; i++) {
    let topOffset = top + i * (rectHeight / linesCount);
    vertical += `M ${x1} ${topOffset} L${x2} ${topOffset}`;
  }
  return `<g>
  <rect
     x="${x1}"
      y="${top}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${vertical}" style="stroke: ${SiplColors.darkBlue}; stroke-width:1"></path>
</g>`;
};

const gridPattern = (drawer: DetectorPatternDrawer) => {
  const rectWidth = drawer.rectWidth();
  const rectHeight = drawer.rectHeight();
  const { x1, x2, top, bottom } = drawer.getBounds();
  let horizontalLines = '';
  let verticalLines = '';
  const linesCount = 5;
  const countOfCells = Math.round(rectWidth / Constants.COLUMN_WIDTH);
  for (let i = 0; i < countOfCells; i++) {
    verticalLines += `M ${
      x1 + i * Constants.COLUMN_WIDTH + Constants.COLUMN_WIDTH / 2
    } ${top} L${
      x1 + i * Constants.COLUMN_WIDTH + Constants.COLUMN_WIDTH / 2
    } ${bottom}`;
  }
  for (let i = 1; i < linesCount; i++) {
    let topOffset = top + i * (rectHeight / linesCount);
    horizontalLines += `M ${x1} ${topOffset} L${x2} ${topOffset}`;
  }

  return `<g>
  <rect
     x="${x1}"
      y="${top}"
       width="${rectWidth}"
        height="${rectHeight}"
       style="stroke: ${SiplColors.darkBlue};stroke-width: 1; fill:white"
       ></rect>
       <path d="${horizontalLines}" style="stroke: ${SiplColors.darkBlue}; stroke-width:1"></path>
       <path d="${verticalLines}" style="stroke: ${SiplColors.darkBlue}; stroke-width:1"></path>
</g>`;
};
