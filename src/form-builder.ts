import {
  Form,
  FormQuestion,
  FormElement,
  FormGroup,
  FormState,
  FormConfig,
} from './types'
import {
  IFormElementBuilder,
  FormElementBuilder,
  IFormElementBuilderInternal,
} from './form-element-builder'
import {
  IGroupElementBuilder,
  GroupElementBuilder,
  IGroupElementBuilderInternal,
} from './recurring-groups'
import set from 'set-value'
import get from 'get-value'

export interface IFormBuilder<T extends Form> {
  getState: () => FormState<T>
  getConfigurator: () => FormConfig<T>
}

export class FormBuilder<T extends Form> implements IFormBuilder<T> {
  private form: T

  private _configurator: GroupConfiguratorEquivalent<T, T>
  private _state: GroupState<T, T>

  constructor(form: T) {
    this.form = form
    this._configurator = buildConfig(form)
    this._state = this.initializeFormState(form)
  }

  public getState: () => FormState<T> = () => this._state

  public getConfigurator: () => FormConfig<T> = () => this._configurator

  private initializeFormState<I extends FormGroup>(
    form: I,
    path = '',
    root: any = {},
    isRoot = true,
    index: number | undefined = undefined
  ): GroupState<T, I> {
    const dottedPath = path ? path + '.' : ''
    const entries = Object.entries(form).map(([key, value]) => {
      const nextPath = dottedPath + key

      if (isQuestion(value)) {
        const state =
          typeof index === 'number'
            ? new RecurringGroupStateObject<T, typeof value>(
                this.form,
                this._configurator,
                nextPath,
                root,
                index
              )
            : new FormStateObject<T, typeof value>(
                this.form,
                this._configurator,
                nextPath,
                root
              )
        return [key, state]
      }

      if (Array.isArray(value) && value.length) {
        const asGroup = <FormGroup[]>value
        const sub = asGroup.map((x, i) =>
          this.initializeFormState(
            <FormGroup>x,
            `${nextPath}[${i}]`,
            root,
            false,
            i
          )
        )
        return [key, sub]
      }

      const sub = this.initializeFormState(
        <FormGroup>value,
        nextPath,
        root,
        false
      )
      return [key, sub]
    })

    const ret =
      typeof index === 'number'
        ? new RecurringGroupStateObject<T, I>(
            this.form,
            this._configurator,
            path,
            root,
            index
          )
        : new FormStateObject<T, I>(this.form, this._configurator, path, root)

    const other = Object.fromEntries(entries)
    Object.assign(ret, other)

    if (isRoot) {
      Object.assign(root, ret)
    }

    return <any>ret
  }
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

type RecurringConfigurator<I extends FormGroup[]> = {
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

export interface IArrayOperations<T extends FormGroup> {
  append: (group: T) => void
  remove: (index: number) => void
  insert: (index: number, group: T) => void
}

export interface IQuestionState<T extends FormElement>
  extends IFormStateObject {
  $value: T
}

function isQuestion(unknown: unknown): boolean {
  const types = ['string', 'number']
  const isMultipleChoice: boolean =
    Array.isArray(unknown) &&
    (!unknown.length || types.includes(typeof unknown[0]))
  return types.includes(typeof unknown) || isMultipleChoice
}

export function buildConfig<TForm extends Form, TGroup extends FormGroup>(
  group: TGroup,
  path = '',
  isRecurring = false
): GroupConfiguratorEquivalent<TForm, TGroup> {
  const dottedPath = path ? path + '.' : ''
  const entries = Object.entries(group).map(([key, value]) => {
    const nextPath = dottedPath + key

    if (isQuestion(value)) {
      const config = isRecurring
        ? new GroupElementBuilder(nextPath)
        : new FormElementBuilder(nextPath)
      return [key, config]
    }

    if (Array.isArray(value) && value.length) {
      const first = value[0]
      const sub = buildConfig<TForm, FormGroup>(
        <FormGroup>first,
        nextPath,
        true
      )
      return [key, sub]
    }

    const sub = buildConfig<TForm, FormGroup>(
      <FormGroup>value,
      nextPath,
      isRecurring
    )
    return [key, sub]
  })

  const ret = isRecurring
    ? new GroupElementBuilder(path)
    : new FormElementBuilder(path)
  const other = Object.fromEntries(entries)
  Object.assign(ret, other)
  return <any>ret
}

export interface IFormStateObject {
  readonly $isActive: boolean
  readonly $isRequired: boolean
  readonly $path: string
}

function getParentPath(path: string): string | undefined {
  const split = path.split('.')
  if (!isNaN(Number.parseInt(split[split.length - 1]))) {
    if (split.length > 2) {
      return split.slice(0, -2).join('.')
    }
  } else if (split.length > 1) {
    return split.slice(0, -1).join('.')
  }
}

class FormStateObject<T extends Form, I extends FormElement>
  implements IQuestionState<I> {
  readonly $path: string
  private _form: T
  private _root: GroupState<T, T>
  private _ownConfig: IFormElementBuilderInternal<T>
  private _parentPath: string | undefined
  private _safePath: string

  constructor(
    form: T,
    config: FormConfig<T>,
    path: string,
    root: FormState<T>
  ) {
    const safePath = path.replace(/\[/g, '.').replace(/\]/g, '')

    this._form = form
    this.$path = path
    this._safePath = safePath
    this._root = root
    

    this._ownConfig = get(config, safePath)
    this._parentPath = getParentPath(safePath)
  }

  private _selfIsActive(): boolean {
    const config = this._ownConfig
    return (
      !config ||
      typeof config._isActive !== 'function' ||
      config._isActive(this._root)
    )
  }

  private _selfIsRequired(): boolean {
    const config = this._ownConfig
    return (
      config &&
      typeof config._isRequired === 'function' &&
      config._isRequired(this._root)
    )
  }

  private _parentIsActive(): boolean {
    if (typeof this._parentPath === 'undefined') {
      return true
    }
    const parent = get(this._root, this._parentPath)

    if (!parent) {
      return true
    }

    return parent.$isActive
  }

  private _parentIsRequired(): boolean {
    if (typeof this._parentPath === 'undefined') {
      return false
    }
    const parent = get(this._root, this._parentPath)

    if (!parent) {
      return false
    }

    return parent.$isRequired
  }

  get $isActive(): boolean {
    return this._parentIsActive() && this._selfIsActive()
  }

  get $isRequired(): boolean {
    return this._parentIsRequired() || this._selfIsRequired()
  }

  get $value(): I {
    return get(this._form, this._safePath)
  }

  set $value(value: I) {
    set(this._form, this._safePath, value)
  }
}

class RecurringGroupStateObject<T extends Form, I extends FormElement>
  implements IQuestionState<I> {
  readonly $path: string
  private _form: T
  private _root: GroupState<T, T>
  private _ownConfig: IGroupElementBuilderInternal<T>
  private _parentPath: string | undefined
  private _index: number
  private _safePath: string

  constructor(
    form: T,
    config: FormConfig<T>,
    path: string,
    root: FormState<T>,
    index: number
  ) {
    const safePath = path.replace(/\[/g, '.').replace(/\]/g, '')
    const configPath = path.replace(/\[[0-9]+\]/g, '')

    this._index = index
    this._form = form
    this.$path = path
    this._root = root
    this._safePath = safePath
    this._ownConfig = get(config, configPath)
    this._parentPath = getParentPath(safePath)
  }

  private _selfIsActive(): boolean {
    const config = this._ownConfig
    return (
      !config ||
      typeof config._isActive !== 'function' ||
      config._isActive(this._root, this._index)
    )
  }

  private _selfIsRequired(): boolean {
    const config = this._ownConfig
    return (
      config &&
      typeof config._isRequired === 'function' &&
      config._isRequired(this._root, this._index)
    )
  }

  private _parentIsActive(): boolean {
    if (typeof this._parentPath === 'undefined') {
      return true
    }
    const parent = get(this._root, this._parentPath)

    if (!parent) {
      return true
    }

    return parent?.$isActive
  }

  private _parentIsRequired(): boolean {
    if (typeof this._parentPath === 'undefined') {
      return false
    }
    const parent = get(this._root, this._parentPath)

    if (!parent) {
      return false
    }

    return parent?.$isRequired
  }

  get $isActive(): boolean {
    return this._parentIsActive() && this._selfIsActive()
  }

  get $isRequired(): boolean {
    return this._parentIsRequired() || this._selfIsRequired()
  }

  get $value(): I {
    return get(this._form, this._safePath)
  }

  set $value(value: I) {
    set(this._form, this._safePath, value)
  }
}
