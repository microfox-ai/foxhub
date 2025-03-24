export const findLastElement = <T>(array: T[]) => {
  return array[array.length - 1];
};

export const findFirstElement = <T>(array: T[]) => {
  return array[0];
};

export const findLastElementWith = <T>(
  array: T[],
  predicate: (element: T) => boolean
) => {
  let new_array = array.filter(predicate);
  if (!new_array) {
    return null;
  }
  return new_array?.[new_array.length - 1];
};
