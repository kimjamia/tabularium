export function parseClipboardData(text) {
  if (!text) {
    return [];
  }

  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter((row, index, arr) => !(row === '' && index === arr.length - 1))
    .map((row) => row.split('\t'));
}

export function serializeClipboardData(matrix) {
  return matrix.map((row) => row.join('\t')).join('\n');
}
