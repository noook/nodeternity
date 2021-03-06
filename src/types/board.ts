// eslint-disable-next-line
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import Piece from './piece';
import { shuffle, partition } from '@/utils';
import { History } from './history';

type EdgeBox = Box & {
  y: 0 | 15;
} & {
  x: 0 | 15;
}

type Position = 'top' | 'bottom' | 'left' | 'right';

export class Box {
  public id: number;
  public piece: Piece;
  public x: number;
  public y: number;

  public constructor(id: number, x: number, y: number) {
    this.piece = new Piece({
      id: 0,
      top: 0,
      bottom: 0,
      right: 0,
      left: 0,
    });
    this.id = id;
    this.x = x;
    this.y = y;
  }

  public setPiece(piece: Piece): this {
    this.piece = piece;

    return this;
  }

  public isCorner(): boolean {
    // 2 of coordinates are sides
    return [this.x === 0, this.y === 0, this.x === 15, this.y === 15]
      .filter(test => test === true).length > 1;
  }

  public isBorder(): this is EdgeBox {
    // One of the coordinates is a side
    return this.x === 0 || this.y === 0 || this.x === 15 || this.y === 15;
  }
}

export class Board {
  public boxes: Box[][] = [];
  public width: number;
  public height: number;
  private best: number = 0;
  private history: History = [];

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    let id = 1;

    for (let i = 0; i < height; i += 1) {
      const row: Box[] = [];

      for (let j = 0; j < width; j += 1) {
        row.push(new Box(id, j, i));
        id += 1;
      }
      this.boxes.push(row);
    }
  }

  public solve(pieces: Piece[], tried: number[]) {
    // Solves the puzzle from the middle
    const box = this.closestEmptyCell(7, 8, tried);
    if (box === null) {
      return;
    }
    tried.push(box.id);

    for (let i = 0; i < pieces.length; i += 1) {
      const assigned = this.assignPiece(box, pieces[i]);

      if (assigned) {
        this.setPiece(pieces.splice(i, 1)[0], box.x, box.y);
        this.output();
        this.solve(pieces, tried);
        const piece = this.removePiece(box.x, box.y);
        pieces.push(piece);
      }
    }
  }

  public solveBorders(borders: Piece[]) {
    // Separates corners from edges
    const [corners, edges] = partition(borders, piece => piece.isCorner());
    this.setCorners(shuffle(corners) as [Piece, Piece, Piece, Piece]);
    this.solveEdges(edges);
  }

  public setPiece(piece: Piece, x: number, y: number): this {
    this.boxes[y][x].setPiece(piece);
    this.history.push({
      type: 'add',
      piece: {
        id: piece.id,
        rotation: piece.rotation,
        x, y,
      },
    });

    return this;
  }

  public removePiece(x: number, y: number): Piece {
    const piece = this.boxes[y][x].piece;
    this.boxes[y][x].piece = new Piece();

    this.history.push({
      type: 'remove',
      piece: {
        id: piece.id,
        rotation: piece.rotation,
        x, y,
      },
    });

    return piece;
  }

  get validBoxes(): number {
    return this.boxes.reduce((acc, row) => {
      acc += row.filter(box => box.piece.id !== 0).length;
      return acc;
    }, 0);
  }

  public setCorners(corners: [Piece, Piece, Piece, Piece]): this {
    const [topLeft, topRight, bottomLeft, bottomRight] = corners;
    // Rotates corners in the right position
    while (!(topLeft.top === 0 && topLeft.left === 0)) {
      topLeft.rotate(1);
    }
    while (!(topRight.top === 0 && topRight.right === 0)) {
      topRight.rotate(1);
    }
    while (!(bottomLeft.bottom === 0 && bottomLeft.left === 0)) {
      bottomLeft.rotate(1);
    }
    while (!(bottomRight.bottom === 0 && bottomRight.right === 0)) {
      bottomRight.rotate(1);
    }
    this.setPiece(topLeft, 0, 0);
    this.setPiece(topRight, this.width - 1, 0);
    this.setPiece(bottomLeft, 0, this.height - 1);
    this.setPiece(bottomRight, this.width - 1, this.height - 1);

    return this;
  }

  public closestEmptyCell(x: number, y: number, tried: number[] = []): Box | null {
    const maxRange = this.height > this.width ? this.height : this.width;

    // rangeInc = circle radius lookup
    for (let rangeInc = 1; rangeInc <= maxRange / 2; rangeInc += 1) {
      for (let i = -1 * rangeInc; i <= rangeInc; i += 1) {
        for (let j = -1 * rangeInc; j <= rangeInc; j += 1) {
          // Index out of range
          if (x + j < 0 || y + i < 0 || x + j > this.width || y + i > this.height) {
            continue;
          }
          // Same
          if (!this.boxes[j + y][i + x]) {
            return null;
          }

          // Borders are solved differently
          if (this.boxes[j + y][i + x].isBorder()) {
            continue;
          }

          // If no piece around - Resolving is not interesting
          if (this.boxes[j + y - 1][i + x].piece.id === 0
            && this.boxes[j + y + 1][i + x].piece.id === 0
            && this.boxes[j + y][i + x - 1].piece.id === 0
            && this.boxes[j + y][i + x + 1].piece.id === 0) {
            continue;
          }

          if (tried.includes(this.boxes[j + y][i + x].id)) {
            continue;
          }

          // Found
          if (this.boxes[j + y][i + x].piece.id === 0) {
            return this.boxes[j + y][i + x];
          }
        }
      }
    }

    return null;
  }

  public assignPiece(box: Box, piece: Piece): boolean {
    if (box.isBorder()) {
      return this.assignEdge(box, piece);
    }
    const ok = {
      top: true,
      bottom: true,
      left: true,
      right: true,
    };

    // Checks position in all rotation possibilities
    // Condition represents: Does the [position] piece exists? Yes: Is it an empty piece? No: ignore this side
    for (let i = 0; i < 4; i += 1) {
      // Top
      if (this.boxes[box.y - 1][box.x] && this.boxes[box.y - 1][box.x].piece.id !== 0) {
        ok.top = this.boxes[box.y - 1][box.x].piece.bottom === piece.top;
      }
      // Bottom
      if (this.boxes[box.y + 1][box.x] && this.boxes[box.y + 1][box.x].piece.id !== 0) {
        ok.bottom = this.boxes[box.y + 1][box.x].piece.top === piece.bottom;
      }
      // Left
      if (this.boxes[box.y][box.x - 1] && this.boxes[box.y][box.x - 1].piece.id !== 0) {
        ok.left = this.boxes[box.y][box.x - 1].piece.right === piece.left;
      }
      // Right
      if (this.boxes[box.y][box.x + 1] && this.boxes[box.y][box.x + 1].piece.id !== 0) {
        ok.right = this.boxes[box.y][box.x + 1].piece.left === piece.right;
      }

      // Checks that all properties of ok are true.
      if (Object.values(ok).every(val => val === true)) {
        return true;
      }
      piece.rotate(1);
    }

    return false;
  }

  private getEdges(): EdgeBox[] {
    return this.boxes.reduce<EdgeBox[]>((acc, row) => {
      acc.push(...row.filter((box): box is EdgeBox => box.isBorder() && !box.isCorner()));
      return acc;
    }, []);
  }

  public solveEdges(borders: Piece[]) {
    const edges = this.getEdges();
    const tried: number[] = [];
    for (let i = 0; i < edges.length; i += 1) {
      const piece = this.tryEdge(edges[i], borders);
      if (piece !== null) {
        borders.splice(borders.findIndex(p => p.id === piece.id), 1);
      }
    }
  }

  private tryEdge(edge: EdgeBox, pieces: Piece[]): Piece | null {
    for (let i = 0; i < pieces.length; i += 1) {
      const assigned = this.assignEdge(edge, pieces[i]);
      if (assigned) {
        this.setPiece(pieces[i], edge.x, edge.y);
        return pieces[i];
      }
    }
    return null;
  }

  private assignEdge(box: EdgeBox, piece: Piece): boolean {
    const ok = {
      top: true,
      bottom: true,
      left: true,
      right: true,
    };
    let position!: Position;

    if (box.y === 0) {
      position = 'top';
    } else if (box.y === 15) {
      position = 'bottom';
    } else if (box.x === 0) {
      position = 'left';
    } else if (box.x === 15) {
      position = 'right';
    }

    while (piece[position] !== 0) {
      piece.rotate(1);
    }

    /**
     * @see this.assignPiece
     */
    if (position !== 'top' && this.boxes[box.y - 1][box.x].piece.id !== 0) {
      ok.top = this.boxes[box.y - 1][box.x].piece.bottom === piece.top;
    }
    if (position !== 'bottom' && this.boxes[box.y + 1][box.x].piece.id !== 0) {
      ok.bottom = this.boxes[box.y + 1][box.x].piece.top === piece.bottom;
    }
    if (position !== 'left' && this.boxes[box.y][box.x - 1].piece.id !== 0) {
      ok.left = this.boxes[box.y][box.x - 1].piece.right === piece.left;
    }
    if (position !== 'right' && this.boxes[box.y][box.x + 1].piece.id !== 0) {
      ok.right = this.boxes[box.y][box.x + 1].piece.left === piece.right;
    }

    return Object.values(ok).every(val => val === true);
  }

  public export(): string {
    const output: string[] = [];

    this.boxes.forEach((row: Box[]) => {
      const outputRow: string[] = [];
      row.forEach((box: Box) => {
        if (box.piece.id === 0) {
          outputRow.push('X');
        } else {
          // Pieces were originally labelled 1 - 256 instead of 0 - 255
          outputRow.push(`${box.piece.id - 1}(${box.piece.rotation})`);
        }
      });
      output.push(outputRow.join('-'));
    });

    // eslint-disable-next-line
    return output.join("\n");
  }

  public output(): void {
    if (this.validBoxes < 150 || this.validBoxes < this.best) {
      return;
    }
    this.best = this.validBoxes;

    const ouputFile = join(__dirname, '..', '..', 'outputs', `${this.validBoxes}.txt`);
    const outputHistoryFile = join(__dirname, '..', '..', 'history-output', `${this.validBoxes}.json`);
    writeFileSync(ouputFile, this.export());
    writeFileSync(outputHistoryFile, JSON.stringify(this.history, undefined, 2));
  }

  public reset() {
    this.boxes = [];
    let id = 1;

    for (let i = 0; i < this.height; i += 1) {
      const row: Box[] = [];

      for (let j = 0; j < this.width; j += 1) {
        row.push(new Box(id, j, i));
        id += 1;
      }
      this.boxes.push(row);
    }
  }

  public randomFill() {
    const piecesReference = readFileSync(join(__dirname, '..', '..', 'pieces.txt'), 'utf-8');
    // eslint-disable-next-line
    const reference = piecesReference.split("\n");
    let pieces: Piece[] = [];

    for (let i = 0; i < 256; i += 1) {
      const [top, bottom, left, right] = reference[i]
        .split(' ')
        .map(el => parseInt(el, 10));

      pieces.push(new Piece({
        id: i + 1,
        top,
        bottom,
        left,
        right,
      }));
    }

    pieces = shuffle(pieces);

    for (let i = 0; i < this.height; i += 1) {
      for (let j = 0; j < this.width; j += 1) {
        this.setPiece(pieces.shift()!, j, i);
      }
    }
  }
}
