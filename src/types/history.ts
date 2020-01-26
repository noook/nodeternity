interface Action {
  type: 'add' | 'remove';
  piece: {
    x: number;
    y: number;
    id: number;
    rotation: number;
  }
}

export type History = Action[];
