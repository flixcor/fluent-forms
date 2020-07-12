import set from 'set-value'
import get from 'get-value'

type boolFunc<T> = (arg: T) => boolean

function copy<T extends Record<any, any>>(obj: T): T {
  const ret: Record<any, any> = {}
  Object.assign(ret, obj)
  return ret
}

export function createProxy<T extends Record<any, any>>(
  obj: T,
  path: any[] = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = obj
): T & dollars<T> {
  const ret = new Proxy(<any>obj, {
    get(target: any, key: any) {
      const currentPathString = path.join('.')

      if (key === '$isProxy') return true
      if (key === '$root') return root
      if (key === '$path') return currentPathString
      if (key === '$value') {
        return get(root, currentPathString)
      }
      if (key === '$isRequiredWhen')
        return (ding: boolFunc<T>) => {
          requiredFuncs.set(currentPathString, () => ding(root))
        }
      if (key === '$isActiveWhen')
        return (ding: boolFunc<T>) => {
          activeFuncs.set(currentPathString, () => ding(root))
        }
      if (key === '$isRequired') {
        let func = requiredFuncs.get(currentPathString)
        if (!func) {
          func = () => false
          requiredFuncs.set(currentPathString, func)
        }
        return func()
      }
      if (key === '$isActive') {
        let func = activeFuncs.get(currentPathString)
        if (!func) {
          func = () => true
          activeFuncs.set(currentPathString, func)
        }
        return func()
      }

      const prop = target[key]

      if (typeof prop == 'undefined') {
        return
      }

      const newPath = [...path, key]

      // set value as proxy
      const propObj =
        typeof prop === 'object' ? copy(prop) : { path: newPath.join('.') }

      if (!propObj.$isProxy)
        return createProxy(propObj, newPath, requiredFuncs, activeFuncs, root)

      return
    },
    set(target: any, key: any, value: any) {
      if (key === '$value') {
        const path = target.path
        if (!path) {
          throw 'could not find path'
        }
        set(root, path, value)
        return true
      }

      throw 'set not supported'
    },
  })
  return ret
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
