// eslint-disable-next-line
import { readFileSync } from 'fs';
import { join } from 'path';

interface PieceParams {
  id: number;
  top: number;
  bottom: number;
  right: number;
  left: number;
}

const pieceDefaultParams: PieceParams = {
  id: 0,
  top: 0,
  bottom: 0,
  right: 0,
  left: 0,
};

export default class Piece {
  public id: number;
  public rotation: number;
  public top: number;
  public bottom: number;
  public right: number;
  public left: number;

  public constructor(params: PieceParams = pieceDefaultParams) {
    this.id = params.id;
    this.rotation = 0;
    this.top = params.top;
    this.bottom = params.bottom;
    this.right = params.right;
    this.left = params.left;
  }

  public rotate(times: number) {
    if (times === 0) return;
    const copy = (({ ...props }) => props)(this);

    this.top = copy.left;
    this.right = copy.top;
    this.bottom = copy.right;
    this.left = copy.bottom;
    this.rotation = (this.rotation + 1) % 4;

    if (times > 1) {
      this.rotate(times - 1);
    }
  }

  public isBorder(): boolean {
    return [this.top, this.left, this.right, this.bottom]
      .includes(0);
  }

  public isCorner(): boolean {
    return [this.top, this.left, this.right, this.bottom]
      .filter(side => side === 0).length > 1;
  }
}

export const pieces = (() => {
  const piecesReference = readFileSync(join(__dirname, '..', '..', 'pieces.txt'), 'utf-8');
  // eslint-disable-next-line
  const references = piecesReference.split("\n");

  return [...Array(references.length)]
    .map((_, index) => {
      const [top, bottom, left, right] = references[index]
        .split(' ')
        .map(el => parseInt(el, 10));

      return new Piece({
        id: index + 1,
        top,
        bottom,
        left,
        right,
      });
    });
})();
