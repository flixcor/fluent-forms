import get from 'get-value'
import { defineProperty } from './utilities'

export type FormQuestion = string | number | (string | number)[]
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | FormGroup[]
export type Form = Record<PropertyKey, FormElement>
export type RecurringGroup<T extends FormGroup> = [T, ...T[]]
export type FormState<T extends Form> = GroupState<T, T>
export type FormConfig<T extends Form> = GroupConfiguratorEquivalent<T, T>

export interface IFormBuilder<T extends Form> {
  getState: () => FormState<T>
  getConfigurator: () => FormConfig<T>
  getForm: () => T
}

export type GroupState<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupState<T, I[key]>
    : I[key] extends FormGroup[]
    ? ReadonlyArray<GroupState<T, I[key][0]>> & IArrayOperations<I[key][0]>
    : I[key] extends FormQuestion
    ? IQuestionState<I[key]>
    : never
} &
  IFormStateObject

export type RecurringConfigurator<I extends FormGroup[]> = {
  [key in keyof I[0]]: I[0][key] extends FormGroup[]
    ? RecurringConfigurator<I[0][key]>
    : I[0][key] extends FormQuestion | FormGroup
    ? IGroupElementBuilder<I[0]>
    : never
} &
  IGroupElementBuilder<I[0]>

export type GroupConfiguratorEquivalent<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupConfiguratorEquivalent<T, I[key]>
    : I[key] extends FormGroup[]
    ? RecurringConfigurator<I[key]>
    : I[key] extends FormQuestion
    ? IFormElementBuilder<T>
    : never
} &
  IFormElementBuilder<T>

export interface IArrayOperations<T> {
  $append: (group: T) => void
  $remove: (index: number) => void
  $insert: (index: number, group: T) => void
}

export interface IQuestionState<T extends FormElement>
  extends IFormStateObject {
  $value: T
  $isActiveAnd: (evaluation: (value: T) => boolean) => boolean
}

export interface IFormStateObject {
  readonly $isActive: boolean
  readonly $isRequired: boolean
  readonly $path: string
}

export interface IFormElementBuilder<TForm extends Form> {
  $isRequiredWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm>
  $isActiveWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm>
}

export interface IGroupElementBuilder<TGroup extends FormGroup> {
  $isRequiredWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
  $isActiveWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

export type FormConfigV2<T extends FormGroupV2> = InBetween<T, T>

export type InBetween<T extends FormGroupV2, I extends FormGroupV2> = {
  [key in keyof I]: I[key] extends FormGroupV2
    ? GroupConfiguratorEquivalentV2<T, I[key]>
    : I[key] extends FormGroupV2[]
    ? [RecurringConfiguratorV2<T, I[key][0]>]
    : I[key] extends FormQuestion
    ? IFormElementBuilderV2<T>
    : unknown
}

export type GroupConfiguratorEquivalentV2<
  T extends FormGroupV2,
  I extends FormGroupV2
> = InBetween<T, I> & IFormElementBuilderV2<T>

export type RecurringConfiguratorV2<
  T extends FormGroupV2,
  I extends FormGroupV2
> = {
  [key in keyof I]: I[key] extends FormGroupV2[]
    ? [RecurringConfiguratorV2<T, I[key][0]>]
    : I[key] extends FormGroupV2
    ? RecurringConfiguratorV2<T, I[key]>
    : I[key] extends FormQuestion
    ? IGroupElementBuilderV2<T>
    : unknown
} &
  IGroupElementBuilderV2<T>

export interface IFormElementBuilderV2<TForm extends FormGroupV2> {
  $isRequired?: boolean | ((form: FormStateV2<TForm>) => boolean)
  $isActive?: boolean | ((form: FormStateV2<TForm>) => boolean)
}

export interface IGroupElementBuilderV2<TGroup extends FormGroupV2> {
  $isActive?: boolean | ((form: FormStateV2<TGroup>, index: number) => boolean)
  $isRequired?:
    | boolean
    | ((form: FormStateV2<TGroup>, index: number) => boolean)
}

export type FormStateV2<T extends FormGroupV2> = GroupStateV2<T, T>

export type FormGroupV2 = Record<PropertyKey, unknown>

export type GroupStateV2<T extends FormGroupV2, I extends FormGroupV2> = {
  [key in keyof I]: I[key] extends FormGroupV2
    ? GroupStateV2<T, I[key]>
    : I[key] extends FormGroupV2[]
    ? ReadonlyArray<GroupStateV2<T, I[key][0]>> & IArrayOperations<I[key][0]>
    : I[key] extends FormQuestion
    ? IQuestionState<I[key]>
    : never
} &
  IFormStateObject

//////////////////////////////
/////////////////////////////
////////////////////////////

interface IGroup {
  [key: string]: FormElement
  question4: string
  group2: IGroup2
}

interface IGroup2 {
  [key: string]: FormElement
  question5: number
}

interface IMyForm {
  [key: string]: FormElement
  question1: string
  question2: number
  question3: number[]
  recurringGroup: IGroup[]
}

import setValue from 'set-value'
import getValue from 'get-value'
import {
  isActiveRecursive,
  getOrDefault,
  isInteger,
  isRequiredRecursive,
} from './form-builder'

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

export function buildFormState<T extends FormGroupV2>(
  form: RecursivePartial<T>,
  config: FormConfigV2<T>,
  path: string[] = [],
  index = -1,
  configMap = new Map<
    string,
    {
      $isActive: (val: unknown, i: number) => boolean
      $isRequired: (val: unknown, i: number) => boolean
    }
  >()
): FormStateV2<T> {
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
        const formGroups = getValue(form, pathStr)
        const groupConfig = value[0]
        return [
          key,
          buildRecurring(
            form,
            config,
            formGroups,
            groupConfig,
            newPath,
            configMap
          ),
        ]
      }

      const state = buildFormState(
        form,
        (value as unknown) as FormConfigV2<T>,
        newPath,
        index,
        configMap
      )

      return [key, state]
    })
  const safePath = path.filter((x) => !isInteger(x))
  const pathStr = safePath.join('.')

  const { $isActive, $isRequired } = getValue(config, pathStr)
  const _isActive = boolFuncOrDefault($isActive, () => true)
  const _isRequired = boolFuncOrDefault($isRequired, () => false)

  configMap.set(pathStr, { $isActive: _isActive, $isRequired: _isRequired })

  const getVal = () => getValue(form, pathStr)
  const setVal = (val: unknown) => setValue(form, pathStr, val)
  const isActiveFunc = () =>
    isActiveRecursive(path, (p: string) => {
      const { $isActive } = getConfigOrDefault(p)
      return $isActive(form, index)
    })

  const isRequiredFunc = () =>
    isRequiredRecursive(path, (p: string) => {
      const { $isRequired } = getConfigOrDefault(p)
      return $isRequired(form, index)
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

  return (el as unknown) as FormStateV2<T>
}

function buildRecurring<T extends FormGroupV2>(
  form: RecursivePartial<T>,
  config: FormConfigV2<T>,
  formGroups: T[],
  groupConfig: IGroupElementBuilderV2<T>,
  path: string[],
  configMap: Map<string, any>
): Array<GroupStateV2<T, T>> & IArrayOperations<T> {
  const { $isActive, $isRequired } = groupConfig
  const _isActive = boolFuncOrDefault($isActive, () => true)
  const _isRequired = boolFuncOrDefault($isRequired, () => false)
  const safePath = path.filter((x) => !isInteger(x))
  const pathStr = safePath.join('.')
  configMap.set(pathStr, { $isActive: _isActive, $isRequired: _isRequired })

  const mapper = (i: number) => {
    const newPath = [...path, i.toString()]

    const sub = buildFormState(form, config, newPath, i, configMap)

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

const form: RecursivePartial<IMyForm> & { [key: string]: unknown } = {
  question1: '',
  question2: 0,
  question3: [],
  recurringGroup: [
    {
      group2: {
        question5: 5,
      },
    },
  ],
}

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<any>
    ? RecursivePartial<T[P][0]>[]
    : T[P] extends Record<any, any>
    ? RecursivePartial<T[P]>
    : T[P]
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export const ding: FormConfigV2<IMyForm> = {
  question1: {},
  question2: {},
  question3: {},
  recurringGroup: [
    {
      question4: {},
      group2: {
        question5: {},
      },
    },
  ],
}

buildFormState(form, ding)

export class ElementState {
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
  public $isActiveAnd(func: (val: unknown) => boolean) {
    const val = this._getValueFunc()
    return this._isActiveFunc() && func(val)
  }
}
