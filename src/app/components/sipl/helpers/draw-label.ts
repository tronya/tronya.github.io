import { Label } from '../model/label';

export const createAndRenderLabel = (label: Label): SVGTextElement => {
  const { anchor, fontSize, fill, x = 0, y = 0, rotateText, value } = label;
  const svgTextElement: SVGTextElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text'
    ),
    clones: Node[] = [];
  svgTextElement.setAttribute('x', x.toString());
  svgTextElement.setAttribute('y', y.toString());

  if (fill) {
    svgTextElement.setAttribute('fill', fill);
  }

  if (anchor) {
    svgTextElement.setAttribute('text-anchor', anchor);
  }

  if (fontSize) {
    svgTextElement.setAttribute('font-size', fontSize);
  }

  if (rotateText) {
    svgTextElement.setAttribute('transform', `rotate(-90 ${x} ${y})`);
    svgTextElement.setAttribute('x', (x + 4).toString());
  }

  svgTextElement.textContent = `${value}`;

  return svgTextElement;
};
