import set from 'set-value'
import get from 'get-value'

type boolFunc<T> = (arg: T) => boolean

function copy<T extends Record<string | number, unknown>>(obj: T): T {
  const ret: Record<string | number, unknown> = {}
  Object.assign(ret, obj)
  return ret as T
}

export function createProxy<T extends Record<string | number, unknown>>(
  obj: T,
  path: Array<string | number> = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = obj
): T & dollars<T> {
  const ret = new Proxy(obj, {
    get(target: T, key: string | number) {
      if (typeof key === 'string' && key.startsWith('$'))
        return getEnhancements(key, obj, path, requiredFuncs, activeFuncs, root)

      if (!(key in target)) throw 'key ' + key + ' not found'

      const prop = target[key]
      const newPath = [...path, key]

      const propObj: Record<string | number, unknown> =
        typeof prop === 'object'
          ? copy(<Record<string | number, unknown>>prop)
          : { $path: newPath.join('.') }

      return createProxy(propObj, newPath, requiredFuncs, activeFuncs, root)
    },
    set(target: T, key: string | number, value: unknown) {
      if (key === '$value') {
        const path = target.$path
        if (typeof path !== 'string') {
          throw 'could not find path for key ' + key
        }
        set(root, path, value)
        return true
      }

      throw 'set not supported for key ' + key
    },
  })
  return ret as T & dollars<T>
}

function getEnhancements<T extends Record<string | number, unknown>>(
  key: string,
  obj: T,
  path: Array<string | number> = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = obj
) {
  const currentPathString = path.join('.')

  const options: Record<
    string,
    () => boolean | string | T | ((func: boolFunc<T>) => void)
  > = {
    $isProxy: () => true,
    $root: () => root,
    $path: () => currentPathString,
    $value: () => get(root, currentPathString),
    $isRequiredWhen: () => (func: boolFunc<T>) => {
      requiredFuncs.set(currentPathString, () => func(root))
    },
    $isActiveWhen: () => (func: boolFunc<T>) => {
      activeFuncs.set(currentPathString, () => func(root))
    },
    $isRequired: getOrDefault(requiredFuncs, currentPathString, () => false),
    $isActive: getOrDefault(activeFuncs, currentPathString, () => true),
  }

  return options[key]()
}

function getOrDefault<T, F>(map: Map<T, F>, index: T, otherwise: F): F {
  let found = map.get(index)
  if (typeof found === 'undefined') {
    found = otherwise
    map.set(index, found)
  }
  return found
}

type config<T> = {
  $isRequiredWhen: (a: boolFunc<T>) => config<T>
  $isActiveWhen: (a: boolFunc<T>) => config<T>
}

type state<T> = {
  $isRequired: boolean
  $isActive: boolean
  $value: T
}

type dollars<T> = config<T> & state<T>
