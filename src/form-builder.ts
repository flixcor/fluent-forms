import setValue from 'set-value'
import getValue from 'get-value'
import {
  FormGroup,
  Form,
  FormState,
  FormConfig,
  GroupState,
  IFormBuilder,
  IArrayOperations,
  IDeffoBuilder,
  RecursivePartial,
} from './types'

import { defineProperty } from './utilities'

const isInteger = (s: unknown): boolean =>
  typeof s === 'string' && /^-{0,1}\d+$/.test(s)

function getOrDefault<T, F>(map: Map<T, F>, index: T, otherwise: () => F): F {
  let found = map.get(index)
  if (typeof found === 'undefined') {
    found = otherwise()
    map.set(index, found)
  }
  return found
}

function isActiveRecursive(
  path: string[],
  isActiveFunc: (p: string) => boolean,
  level = 0
): boolean {
  if (level >= path.length) {
    return true
  }

  const pathToCheck = path.slice(0, level + 1).join('.')
  return (
    isActiveFunc(pathToCheck) &&
    isActiveRecursive(path, isActiveFunc, level + 1)
  )
}

function isRequiredRecursive(
  path: string[],
  isRequiredFunc: (p: string) => boolean,
  level = 0
): boolean {
  if (level >= path.length) {
    return false
  }

  const pathToCheck = path.slice(0, level).join('.')

  return (
    isRequiredFunc(pathToCheck) ||
    isActiveRecursive(path, isRequiredFunc, level + 1)
  )
}

export function createFormBuilder<T extends Form>(
  form: RecursivePartial<T>,
  config: FormConfig<T>
): IFormBuilder<T> {
  const state = buildFormState(form, config)
  const ret: IFormBuilder<T> = {
    getState(): FormState<T> {
      return (state as unknown) as FormState<T>
    },
    getConfigurator(): FormConfig<T> {
      return (config as unknown) as FormConfig<T>
    },
    getForm(): RecursivePartial<T> {
      return form
    },
  }
  return ret
}

function boolFuncOrDefault(
  val: unknown,
  def: () => boolean
): (val: unknown, i: number) => boolean {
  if (typeof val === 'undefined') {
    return def
  }
  if (typeof val === 'boolean') {
    return () => val
  }
  return val as (val: unknown, i: number) => boolean
}

export function buildFormState<T extends FormGroup>(
  form: RecursivePartial<T>,
  config: FormConfig<T>,
  path: string[] = [],
  index = -1,
  configMap = new Map<string, IDeffoBuilder<T>>(),
  isRoot = true,
  root = {} as FormState<T>
): FormState<T> {
  const getConfigOrDefault = (p: string) =>
    getOrDefault(configMap, p, () => ({
      $isRequired: () => false,
      $isActive: () => true,
    }))

  const entries = Object.entries(config)
    .filter(([key]) => !key.startsWith('$'))
    .map(([key, value]) => {
      const newPath = [...path, key]
      const pathStr = newPath.join('.')

      if (Array.isArray(value) && typeof value[0] === 'object') {
        let formGroups = getValue(form, pathStr)
        if (typeof formGroups === 'undefined') {
          formGroups = []
          setValue(form, pathStr, formGroups)
        }
        const groupConfig = value[0]
        return [
          key,
          buildRecurring(
            form,
            config,
            formGroups,
            groupConfig,
            newPath,
            configMap,
            root
          ),
        ]
      }

      const state = buildFormState(
        form,
        (value as unknown) as FormConfig<T>,
        newPath,
        index,
        configMap,
        false,
        root
      )

      return [key, state]
    })
  const safePath = path.filter((x) => !isInteger(x))
  const pathStr = path.join('.')
  const safePathStr = safePath.join('.')

  const { $isActive, $isRequired } = config
  const _isActive = boolFuncOrDefault($isActive, () => true)
  const _isRequired = boolFuncOrDefault($isRequired, () => false)

  configMap.set(safePathStr, { $isActive: _isActive, $isRequired: _isRequired })

  const getVal = () => getValue(form, pathStr)
  const setVal = (val: unknown) => setValue(form, pathStr, val)
  const isActiveFunc = () =>
    isActiveRecursive(safePath, (p: string) => {
      const { $isActive } = getConfigOrDefault(p)
      return $isActive(root, index)
    })

  const isRequiredFunc = () =>
    isRequiredRecursive(safePath, (p: string) => {
      const { $isRequired } = getConfigOrDefault(p)
      return $isRequired(root, index)
    })

  const el = new ElementState(
    pathStr,
    getVal,
    setVal,
    isActiveFunc,
    isRequiredFunc
  )

  const fromEntries = Object.fromEntries(entries)
  Object.assign(el, fromEntries)

  if (isRoot) {
    Object.assign(root, el)
  }

  return (el as unknown) as FormState<T>
}

function buildRecurring<T extends FormGroup>(
  form: RecursivePartial<T>,
  config: FormConfig<T>,
  formGroups: T[],
  groupConfig: FormConfig<T>,
  path: string[],
  configMap: Map<string, IDeffoBuilder<T>>,
  root: FormState<T>
): Array<GroupState<T, T>> & IArrayOperations<T> {
  const { $isActive, $isRequired } = groupConfig
  const _isActive = boolFuncOrDefault($isActive, () => true)
  const _isRequired = boolFuncOrDefault($isRequired, () => false)
  const safePath = path.filter((x) => !isInteger(x))
  const pathStr = safePath.join('.')
  configMap.set(pathStr, { $isActive: _isActive, $isRequired: _isRequired })

  const mapper = (i: number) => {
    const newPath = [...path, i.toString()]

    const sub = buildFormState(
      form,
      groupConfig,
      newPath,
      i,
      configMap,
      false,
      root
    )

    return sub
  }

  const arr = formGroups.map((_, i) => mapper(i))

  defineProperty(arr, '$path', {
    value: path.join('.'),
    writable: false,
    enumerable: false,
  })

  defineProperty(arr, '$append', {
    value: (val: T) => {
      formGroups.push(val)
      arr.push(mapper(formGroups.length - 1))
    },
    writable: false,
    enumerable: false,
  })
  defineProperty(arr, '$remove', {
    value: (index: number) => {
      arr.splice(index, 1)
      formGroups.splice(index, 1)
    },
    writable: false,
    enumerable: false,
  })
  defineProperty(arr, '$insert', {
    value: (index: number, val: T) => {
      formGroups.splice(1, index, val)
      arr.splice(1, index, mapper(index))
    },
    writable: false,
    enumerable: false,
  })

  return arr
}

class ElementState {
  private _isActiveFunc: () => boolean
  private _getValueFunc: () => unknown
  path: string
  private _setValueFunc: (val: unknown) => void
  private _isRequiredFunc: () => boolean

  constructor(
    path: string,
    getValueFunc: () => unknown,
    setValueFunc: (val: unknown) => void,
    isActiveFunc: () => boolean,
    isRequiredFunc: () => boolean
  ) {
    this.path = path
    this._getValueFunc = getValueFunc
    this._setValueFunc = setValueFunc
    this._isActiveFunc = isActiveFunc
    this._isRequiredFunc = isRequiredFunc
  }

  public get $value(): unknown {
    return this._getValueFunc()
  }
  public set $value(val: unknown) {
    this._setValueFunc(val)
  }
  public get $isActive(): boolean {
    return this._isActiveFunc()
  }
  public get $isRequired(): boolean {
    return this._isRequiredFunc()
  }
  public $isActiveAnd(func: (val: unknown) => boolean): boolean {
    const val = this._getValueFunc()
    return this._isActiveFunc() && func(val)
  }
}
