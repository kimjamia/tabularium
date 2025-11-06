function normalizeValue(input, caseSensitive) {
  if (input === null || typeof input === 'undefined') {
    return '';
  }

  const base = String(input);
  return caseSensitive ? base : base.toLowerCase();
}

export function prepareDropdown(column) {
  const config = column.dropdown ?? {};
  const options = Array.isArray(config.options) ? config.options.slice() : [];
  const valueField = config.valueField ?? 'value';
  const displayField = config.displayField ?? 'label';
  const keyFields = (config.keyFields && config.keyFields.length > 0)
    ? config.keyFields.slice()
    : [valueField];
  const pasteMode = config.pasteMode ?? column.pasteMode ?? 'both';
  const caseSensitive = config.caseSensitive ?? false;

  const indexByValue = new Map();
  const indexByDisplay = new Map();
  const indexByKey = new Map();

  options.forEach((option) => {
    const value = option[valueField] ?? option;
    const display = option[displayField] ?? option;
    const key = keyFields.map((field) => option[field]).join('||');

    const normalizedValue = normalizeValue(value, caseSensitive);
    const normalizedDisplay = normalizeValue(display, caseSensitive);

    if (!indexByValue.has(normalizedValue)) {
      indexByValue.set(normalizedValue, option);
    }

    if (!indexByDisplay.has(normalizedDisplay)) {
      indexByDisplay.set(normalizedDisplay, option);
    }

    indexByKey.set(key, option);
  });

  return {
    options,
    valueField,
    displayField,
    keyFields,
    pasteMode,
    caseSensitive,
    indexByValue,
    indexByDisplay,
    indexByKey,
  };
}

export function matchDropdownOption(column, input, mode) {
  const dropdown = column._dropdown;
  if (!dropdown) {
    return null;
  }

  const { pasteMode, caseSensitive } = dropdown;
  const effectiveMode = mode ?? pasteMode;
  const normalized = normalizeValue(input, caseSensitive);

  const searchModes = effectiveMode === 'both'
    ? ['value', 'display']
    : [effectiveMode];

  for (const searchMode of searchModes) {
    if (searchMode === 'value' && dropdown.indexByValue.has(normalized)) {
      return dropdown.indexByValue.get(normalized);
    }

    if (searchMode === 'display' && dropdown.indexByDisplay.has(normalized)) {
      return dropdown.indexByDisplay.get(normalized);
    }
  }

  return null;
}

export function getDropdownDisplay(column, value) {
  const dropdown = column._dropdown;
  if (!dropdown) {
    return value;
  }

  const normalized = normalizeValue(value, dropdown.caseSensitive);
  const option = dropdown.indexByValue.get(normalized);
  if (option) {
    return option[dropdown.displayField] ?? option;
  }

  return value;
}

export function getDropdownValue(column, option) {
  const dropdown = column._dropdown;
  if (!dropdown || !option) {
    return null;
  }

  return option[dropdown.valueField] ?? option;
}

export function buildDropdownValue(column, rawValue) {
  const dropdown = column._dropdown;
  if (!dropdown) {
    return rawValue;
  }

  if (rawValue === null || typeof rawValue === 'undefined' || rawValue === '') {
    return rawValue;
  }

  const option = matchDropdownOption(column, rawValue);
  if (option) {
    return getDropdownValue(column, option);
  }

  return rawValue;
}
