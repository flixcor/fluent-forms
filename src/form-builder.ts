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
  IFormElementBuilderInternal,
  FormElementBuilder,
} from './form-element-builder'
import { IGroupElementBuilder, GroupElementBuilder } from './recurring-groups'
import set from 'set-value'
import get from 'get-value'

export interface IFormBuilder<T extends Form> {
  getState: () => FormState<T>
  getConfigurator: () => FormConfig<T>
}

export interface IFormEvaluator<T extends Form> {
  evaluate<TE extends FormElement>(
    path: (x: T) => TE,
    evaluation: (x: TE) => boolean
  ): boolean
}

export interface IFormElementState {
  active: boolean
  required: boolean
  path: string
}

export class FormBuilder<T extends Form> {
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
    isRoot = true
  ): GroupState<T, I> {
    const dottedPath = path ? path + '.' : ''
    const entries = Object.entries(form).map(([key, value]) => {
      const nextPath = dottedPath + key

      if (isQuestion(value)) {
        const state = new FormStateObject<T, typeof value>(
          this.form,
          this._configurator,
          nextPath,
          root
        )
        return [key, state]
      }

      const sub = this.initializeFormState(
        <FormGroup>value,
        nextPath,
        root,
        false
      )
      return [key, sub]
    })

    const state = new FormStateObject<T, I>(
      this.form,
      this._configurator,
      path,
      root
    )
    const withState = [...entries, ['$state', state]]
    const ret = Object.fromEntries(withState)

    if (isRoot) {
      Object.assign(root, ret)
    }

    return ret
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
} & { $state: FormStateObject<T, T> }

type RecurringConfigurator<I extends FormGroup[]> = {
  [key in keyof I[0]]: I[0][key] extends FormGroup[]
    ? RecurringConfigurator<I[0][key]>
    : I[0][key] extends FormQuestion | FormGroup
    ? IGroupElementBuilder<I[0]>
    : never
} &
  HasGroupConfig<I[0]>

export type HasRegularConfig<T extends Form> = {
  $config: IFormElementBuilder<T>
}

export type HasGroupConfig<T extends FormGroup> = {
  $config: IGroupElementBuilder<T>
}

export type GroupConfiguratorEquivalent<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupConfiguratorEquivalent<T, I[key]>
    : I[key] extends FormGroup[]
    ? RecurringConfigurator<I[key]>
    : I[key] extends FormQuestion
    ? IFormElementBuilder<T>
    : never
} &
  HasRegularConfig<T>

export interface IArrayOperations<T extends FormGroup> {
  append: (group: T) => void
  remove: (index: number) => void
  insert: (index: number, group: T) => void
}

export interface IQuestionState<T extends FormElement>
  extends IFormStateObject {
  value: T
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

  const config = isRecurring
    ? new GroupElementBuilder(path)
    : new FormElementBuilder(path)

  const withConfig = [...entries, ['$config', config]]
  const ret = Object.fromEntries(withConfig)
  return ret
}

export interface IFormStateObject {
  readonly isActive: boolean
  readonly isRequired: boolean
  readonly path: string
}

function getConfigSafe<T extends Form>(state: FormConfig<T>, path: string) {
  if (!state || !path) return
  const obj = get(state, path)
  if (obj && obj.$config) return obj.$config
  return obj
}

class FormStateObject<T extends Form, I extends FormElement>
  implements IQuestionState<I> {
  private _config: FormConfig<T>
  readonly path: string
  private _form: T
  private _root: GroupState<T, T>

  constructor(
    form: T,
    config: FormConfig<T>,
    path: string,
    root: FormState<T>
  ) {
    this._form = form
    this._config = config
    this.path = path
    this._root = root
  }

  get isActive(): boolean {
    const config = getConfigSafe(this._config, this.path)
    return (
      !config ||
      typeof config._isActive !== 'function' ||
      config._isActive(this._root)
    )
  }

  get isRequired(): boolean {
    const config = getConfigSafe(this._config, this.path)
    return (
      config &&
      typeof config._isActive !== 'function' &&
      config._isRequired(this._root)
    )
  }

  get value(): I {
    return get(this._form, this.path)
  }

  set value(value: I) {
    set(this._form, this.path, value)
  }
}
