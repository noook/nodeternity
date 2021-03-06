/* eslint-disable no-param-reassign */

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length;
  let temporaryValue: T;
  let randomIndex: number;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export function random<T>(arr: T[]): T {
  const index = Math.floor(Math.random() * arr.length);
  return shuffle(arr)[index];
}

export function sleep(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

/**
 * Separates an array in two in function of the predicate passed.
 */
export function partition<T>(array: T[], predicate: (item: T) => Boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsey: T[] = [];

  array.forEach((el) => {
    (predicate(el) === true ? truthy : falsey).push(el);
  });

  return [truthy, falsey];
}
