import {RouterLocation} from './types';
import {isEqualArrays} from '@-/util/src/array/is-equal';

export const parseCurrentLocation = (): RouterLocation => {
  const {pathname: path, hash, search: rawSearch} = window.location;

  return {
    path,
    hash,
    search: new URLSearchParams(rawSearch),
  };
};

export const serializeLocation = (location: RouterLocation): string => {
  const search = location.search.toString();

  return `${location.path}${search ? '?' : ''}${search}${location.hash}`;
};

export const isLocationEqual = (
  a: RouterLocation,
  b: RouterLocation,
): boolean => {
  const {path: pathA, hash: hashA, search: searchA} = a;
  const {path: pathB, hash: hashB, search: searchB} = b;

  if (pathA !== pathB || hashA !== hashB) {
    return false;
  }

  if (searchA.size !== searchB.size) {
    return false;
  }

  for (const key of searchA.keys()) {
    const valueA = searchA.getAll(key);
    const valueB = searchB.getAll(key);

    if (!isEqualArrays(valueA, valueB)) {
      return false;
    }
  }

  return true;
};
