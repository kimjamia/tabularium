export function deepClone(value) {
  if (typeof value === 'undefined' || value === null) {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // fall through
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepClone(entry));
  }

  if (typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = deepClone(value[key]);
      return acc;
    }, {});
  }

  return value;
}
