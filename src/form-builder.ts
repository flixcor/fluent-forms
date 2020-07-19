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
  IQuestionState,
  FormElement,
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
  let state: FormState<T> | null = null
  try {
    state = buildFormState(form, config)
  } catch (error) {
    console.log(error)
  }

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
  path: () => string[] = (): string[] => [],
  index = (): number => -1,
  configMap = new Map<string, IDeffoBuilder<T>>(),
  isRoot = true,
  root = {} as FormState<T>,
  stateArr: ElementState[] = []
): FormState<T> {
  const getConfigOrDefault = (p: string) =>
    getOrDefault(configMap, p, () => ({
      $isRequired: () => false,
      $isActive: () => true,
    }))

  const safePath = path().filter((x) => !isInteger(x))
  const pathStr = () => path().join('.')
  const safePathStr = safePath.join('.')
  const name = () =>
    path()
      .map((x) => (isInteger(x) ? `[${x}]` : x))
      .join('.')
      .replace(/\.\[/g, '[')

  const { $isActive, $isRequired } = config
  const _isActive = boolFuncOrDefault($isActive, () => true)
  const _isRequired = boolFuncOrDefault($isRequired, () => false)

  configMap.set(safePathStr, { $isActive: _isActive, $isRequired: _isRequired })

  const getVal = () => getValue(form, pathStr())
  const setVal = (val: unknown) => {
    setValue(form, pathStr(), val)
  }
  const isActiveFunc = () =>
    isActiveRecursive(safePath, (p: string) => {
      const { $isActive } = getConfigOrDefault(p)
      return $isActive(root, index())
    })

  const isRequiredFunc = () =>
    isRequiredRecursive(safePath, (p: string) => {
      const { $isRequired } = getConfigOrDefault(p)
      return $isRequired(root, index())
    })

  const el = new ElementState(
    name,
    getVal,
    setVal,
    isActiveFunc,
    isRequiredFunc,
    stateArr
  )

  stateArr.push(el)

  const entries = Object.entries(config)
    .filter(([key]) => !key.startsWith('$'))
    .map(([key, value]) => {
      const newPath = () => [...path(), key]
      const pathStr = newPath().join('.')

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
            root,
            stateArr
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
        root,
        stateArr
      )

      return [key, state]
    })

  const fromEntries = Object.fromEntries(entries)
  Object.assign(el, fromEntries)

  if (isRoot) {
    Object.assign(root, el)
    stateArr.forEach((s) => s.evaluate())
  }

  return (el as unknown) as FormState<T>
}

function buildRecurring<T extends FormGroup>(
  form: RecursivePartial<T>,
  config: FormConfig<T>,
  formGroups: T[],
  groupConfig: FormConfig<T>,
  path: () => string[],
  configMap: Map<string, IDeffoBuilder<T>>,
  root: FormState<T>,
  stateArr: ElementState[]
): Array<GroupState<T, T>> & IArrayOperations<T> {
  const { $isActive, $isRequired } = groupConfig
  const _isActive = boolFuncOrDefault($isActive, () => true)
  const _isRequired = boolFuncOrDefault($isRequired, () => false)
  const safePath = path().filter((x) => !isInteger(x))
  const pathStr = safePath.join('.')
  configMap.set(pathStr, { $isActive: _isActive, $isRequired: _isRequired })

  const mapper = (i: () => number) => {
    const newPath = () => [...path(), i().toString()]

    const sub = buildFormState(
      form,
      groupConfig,
      newPath,
      i,
      configMap,
      false,
      root,
      stateArr
    )

    return sub
  }

  const arr = formGroups.map((x, _, a) => mapper(() => a.indexOf(x)))

  defineProperty(arr, '$path', {
    get: () => path().join('.'),
    enumerable: false,
  })

  defineProperty(arr, '$append', {
    value: (val: T) => {
      formGroups.push(val)
      arr.push(mapper(() => formGroups.indexOf(val)))
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
      arr.splice(
        1,
        index,
        mapper(() => formGroups.indexOf(val))
      )
    },
    writable: false,
    enumerable: false,
  })

  return arr
}

class ElementState implements IQuestionState<FormElement> {
  private _isActiveFunc: () => boolean
  private _getValueFunc: () => unknown
  private _pathFunc: () => string
  private _setValueFunc: (val: unknown) => void
  private _isRequiredFunc: () => boolean
  private _stateArr: ElementState[]
  $isActive = true
  $isRequired = false

  constructor(
    path: () => string,
    getValueFunc: () => unknown,
    setValueFunc: (val: unknown) => void,
    isActiveFunc: () => boolean,
    isRequiredFunc: () => boolean,
    stateArr: ElementState[]
  ) {
    this._pathFunc = path
    this._getValueFunc = getValueFunc
    this._setValueFunc = setValueFunc
    this._isActiveFunc = isActiveFunc
    this._isRequiredFunc = isRequiredFunc
    this._stateArr = stateArr
  }

  public evaluate(): void {
    this.$isActive = this._isActiveFunc()
    this.$isRequired = this._isRequiredFunc()
  }

  public get $path(): string {
    return this._pathFunc()
  }

  public get $value(): FormElement {
    return this._getValueFunc() as FormElement
  }
  public set $value(val: FormElement) {
    this._setValueFunc(val)
    const ownIndex = this._stateArr.indexOf(this)
    this._stateArr.filter((_, i) => i !== ownIndex).forEach((s) => s.evaluate())
  }

  public $isActiveAnd(func: (val: FormElement) => boolean): boolean {
    const val = this._getValueFunc() as FormElement
    return this._isActiveFunc() && func(val)
  }
}
