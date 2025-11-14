export const TRUE_VALUES = new Set(['1', 'true', 'TRUE', 'yes', 'YES', 'y', 'Y', 'x', 'X']);
export const FALSE_VALUES = new Set(['0', 'false', 'FALSE', 'no', 'NO', 'n', 'N', '', null, undefined]);

export const DEFAULT_OPTIONS = {
  allowAddEmptyRow: true,
  dropdownPasteMode: 'both',
  undoLimit: 200,
  keyFields: [],
};

export const CHANGE_SOURCES = {
  EDIT: 'edit',
  PASTE: 'paste',
  FILL: 'fill',
  PROGRAMMATIC: 'programmatic',
  UNDO: 'undo',
};
