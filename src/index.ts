import 'module-alias/register';
import 'dotenv/config';
import "reflect-metadata";
import { cloneDeep } from 'lodash';
import { shuffle, partition } from '@/utils'; // @ is an alias to src
import Piece, { pieces as availablePieces } from './types/piece';
import { Board } from './types/board';

console.clear();

const best: Board[] = [];

function addToScoreBoards(board: Board) {
  best.push(board);
  best.sort((a, b) => b.validBoxes - a.validBoxes).splice(5, 5);
}

function test(): Board {
  let [pieces, borders] = partition(shuffle(cloneDeep(availablePieces)), (piece: Piece) => !piece.isBorder());
  const board = new Board(16, 16);
  const tried : number[] = [];

  const middle = pieces.splice(pieces.findIndex(item => item.id === 139), 1)[0];
  middle.rotate(2);
  board.setPiece(middle, 7, 8);
  board.solveBorders(borders);
  board.solve(pieces, tried);
  addToScoreBoards(board);
  return board;
}

let count = 0;

function run(seconds: number): Promise<number> {
  console.log(`Running for ${seconds} seconds...`);
  return new Promise(resolve => {
    const microtime = Date.now() / 1000;
    while ((Date.now() / 1000) - microtime < seconds) {
      test();
      count += 1;
    }
    resolve(seconds);
  });
}

// run(10)
//   .then((seconds) => {
//     console.log('Top 5 most pieces placed:')
//     console.log(best.map(b => b.validBoxes));
//     console.log(`Ended with ${count} attempts in ${seconds} seconds`);
//     console.log(best[0].output());
//   });

while (true) {
  test();
}
// console.log(best[0].output());