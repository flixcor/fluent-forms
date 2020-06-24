export const getPathString = function (path: (x: any) => any) {
  let str = path.toString()
  str = str.substring(str.indexOf('.') + 1)

  if (str.includes('\n')) {
    str = str.substring(0, str.indexOf('\n'))
  }

  if (str.includes(';')) {
    str = str.substring(0, str.indexOf(';'))
  }

  if (str.includes('}')) {
    str = str.substring(0, str.indexOf('}'))
  }

  return str
}
