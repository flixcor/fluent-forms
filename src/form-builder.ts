import { Form, FormQuestion, FormElement, FormGroup } from './types'
import { getPathString, isElementBuilder } from './utilities'
import {
  FormElementBuilder,
  IFormElementBuilder,
  FormElementBuilderV2,
} from './form-element-builder'
import {
  IRecurringGroupBuilder,
  RecurringGroupBuilder,
  IGroupElementBuilder,
} from './recurring-groups'
import set from 'set-value'
import get from 'get-value'

export interface IFormBuilder<T extends Form> {
  setValue<Qt extends FormQuestion>(path: (x: T) => Qt, value: Qt): void

  getStatus<Qt extends FormQuestion>(
    path: (x: T) => Qt
  ): IFormQuestionStatus<Qt>

  question<Qt extends FormQuestion>(path: (x: T) => Qt): IFormElementBuilder<T>

  group<Gt extends FormGroup>(path: (x: T) => Gt): IFormElementBuilder<T>

  recurringGroup<Gt extends FormGroup>(
    path: (x: T) => Gt[]
  ): IRecurringGroupBuilder<Gt>

  getState: () => StateEquivalent<T>

  getQuestionState<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormQuestionStatus<TQ>

  questionV2<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormElementBuilder<T>

  getConfigurator: () => GroupConfiguratorEquivalent<T, T>
}

export interface IFormEvaluator<T extends Form> {
  evaluate<TE extends FormElement>(
    path: (x: T) => TE,
    evaluation: (x: TE) => boolean
  ): boolean
}

export interface IFormQuestionStatus<T extends FormQuestion>
  extends IFormElementState {
  value: T
  set: (value: T) => void
}

export interface IFormElementState {
  active: boolean
  required: boolean
  path: string
}

export class FormBuilder<T extends Form>
  implements IFormEvaluator<T>, IFormBuilder<T> {
  private form: T

  private questionBuilders: Record<string, unknown> = {}
  private state: StateEquivalent<T>

  constructor(form: T) {
    this.form = form
    this.state = this.initializeFormState(form)
  }

  public getState: () => StateEquivalent<T> = () => this.state

  evaluate<TE extends FormElement>(
    path: (x: T) => TE,
    evaluation: (x: TE) => boolean
  ): boolean {
    const pathString = getPathString(path)
    return this.isActiveRecursive(pathString) && evaluation(path(this.form))
  }

  recurringGroup<Gt extends FormGroup>(
    path: (x: T) => Gt[]
  ): IRecurringGroupBuilder<Gt> {
    return this.getRecurringGroupBuilder(path)
  }

  public question<Qt extends FormQuestion>(
    path: (x: T) => Qt
  ): IFormElementBuilder<T> {
    return this.getElementBuilder(path)
  }

  public group<Gt extends FormGroup>(
    path: (x: T) => Gt
  ): IFormElementBuilder<T> {
    return this.getElementBuilder(path)
  }

  public getStatus<Qt extends FormQuestion>(
    path: (x: T) => Qt
  ): IFormQuestionStatus<Qt> {
    const builder = this.getElementBuilder(path)
    const pathStr = getPathString(path)
    const set = (value: Qt) => this.setValue(path, value)

    return {
      required: builder._isRequired(this),
      active: this.isActiveRecursive(pathStr),
      value: path(this.form),
      path: pathStr,
      set,
    }
  }

  public setValue<Qt extends FormQuestion>(
    path: (x: T) => Qt,
    value: Qt
  ): void {
    const pathStr = getPathString(path).replace(/\[/g, '.').replace(/\]/g, '')
    set(this.form, pathStr, value)
  }

  private isActiveRecursive(path: string, level = 1): boolean {
    const split = path.split('.')

    if (level > split.length) {
      return true
    }

    const currentPath = split.slice(0, level).join('.')

    const builder = this.questionBuilders[currentPath]

    //find a way to work around recurring groups
    if (builder && isElementBuilder<T>(builder) && !builder._isActive(this)) {
      return false
    }

    return this.isActiveRecursive(path, level + 1)
  }

  private getElementBuilder<Et extends FormElement>(path: (x: T) => Et) {
    const pathStr = getPathString(path)

    let builder = <FormElementBuilder<T, Et>>this.questionBuilders[pathStr]

    if (!builder) {
      builder = new FormElementBuilder<T, Et>(path)
      this.questionBuilders[pathStr] = builder
    }

    return builder
  }

  private getRecurringGroupBuilder<Et extends FormGroup>(path: (x: T) => Et[]) {
    const pathStr = getPathString(path)

    let builder = <IRecurringGroupBuilder<Et>>this.questionBuilders[pathStr]

    if (!builder) {
      builder = new RecurringGroupBuilder<T, Et>(() => path(this.form), pathStr)
      this.questionBuilders[pathStr] = builder
    }

    return builder
  }

  private buildStandardRecord(path: string): FormStateObject<T> {
    return {
      active: true,
      required: false,
      activeFunc: (): boolean => true,
      path: path,
      requiredFunc: (): boolean => false,
    }
  }

  setQuestionProps(record: FormStateObject<T>): void {
    const safePath = record.path.replace(/\[/g, '.').replace(/\]/g, '')
    record.set = (value: FormQuestion) => {
      set(this.form, safePath, value)
    }
    record.get = () => get(this.form, safePath)
  }

  public getQuestionState<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormQuestionStatus<TQ> {
    const fakedPath = <(state: StateEquivalent<T>) => FormStateObject<T>>(
      (<unknown>path)
    )
    const { active, required, path: strPath, set } = fakedPath(this.state)
    const value = path(this.form)

    return {
      value,
      active,
      required,
      path: strPath,
      set: <(value: TQ) => void>set,
    }
  }

  public getQuestionStateV2<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormQuestionStatus<TQ> {
    const fakedPath = <(state: StateEquivalent<T>) => any>(<unknown>path)
    const questionState: FormStateObject<T> = fakedPath(this.state)['@state']
    this.setQuestionProps(questionState)
    const { active, required, path: strPath, set } = questionState

    const value = path(this.form)

    return {
      value,
      active,
      required,
      path: strPath,
      set: <(value: TQ) => void>set,
    }
  }

  public questionV2<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormElementBuilder<T> {
    const fakedPath = <(state: StateEquivalent<T>) => any>(<unknown>path)
    const state: FormStateObject<T> = fakedPath(this.state)['@state']
    this.setQuestionProps(state)

    return new FormElementBuilderV2(state, this)
  }

  private initializeFormState<I extends FormGroup>(
    form: I,
    path = ''
  ): GroupStateEquivalent<T, I> {
    const dottedPath = path ? path + '.' : ''
    const entries = Object.entries(form).map(([key, value]) => {
      const nextPath = dottedPath + key

      if (isQuestion(value)) {
        const state = this.buildStandardRecord(nextPath)
        this.setQuestionProps(state)
        return [key, { '@state': state }]
      }

      const sub = this.initializeFormState(<FormGroup>value, nextPath)
      return [key, sub]
    })

    const state = this.buildStandardRecord(path)
    const withState = [...entries, ['@state', state]]
    const ret = Object.fromEntries(withState)
    return ret
  }
}

type StateEquivalent<T extends Form> = GroupStateEquivalent<T, T>

type GroupStateEquivalent<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupStateEquivalent<T, I[key]>
    : I[key] extends FormGroup[]
    ? ReadonlyArray<GroupStateEquivalent<T, I[key][0]>> &
        IArrayOperations<I[key][0]>
    : I[key] extends FormQuestion
    ? IQuestionState<I[key]>
    : never
} & { '@state': FormStateObject<T> }

type RecurringConfigurator<I extends FormGroup[]> = {
  [key in keyof I[0]]: I[0][key] extends FormGroup[]
    ? RecurringConfigurator<I[0][key]>
    : I[0][key] extends FormQuestion | FormGroup
    ? IGroupElementBuilder<I[0]>
    : never
}

type GroupConfiguratorEquivalent<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupConfiguratorEquivalent<T, I[key]>
    : I[key] extends FormGroup[]
    ? RecurringConfigurator<I[key]>
    : I[key] extends FormQuestion
    ? IFormElementBuilder<T>
    : never
} &
  IFormElementBuilder<T>

export class QuestionState<TQ extends FormQuestion> {
  private _set: (value: TQ) => void
  private _get: () => TQ

  constructor(set: (value: TQ) => void, get: () => TQ) {
    this._set = set
    this._get = get
  }

  set value(value: TQ) {
    this._set(value)
  }
  get value(): TQ {
    return this._get()
  }
}

export interface IArrayOperations<T extends FormGroup> {
  append: (group: T) => void
  remove: (index: number) => void
  insert: (index: number, group: T) => void
  replace: (index: number, group: T) => void
}

export interface IQuestionState<T extends FormQuestion> {
  isRequired: boolean
  isActive: boolean
  value: T
}

function isQuestion(unknown: unknown): boolean {
  const types = ['string', 'number']
  const isMultipleChoice: boolean =
    Array.isArray(unknown) &&
    unknown.length > 0 &&
    types.includes(typeof unknown[0])
  return types.includes(typeof unknown) || isMultipleChoice
}

export type FormStateObject<T extends Form> = {
  [key: string]:
    | boolean
    | string
    | ((evaluator: IFormEvaluator<T>) => boolean)
    | ((value: FormQuestion) => void)
  active: boolean
  required: boolean
  path: string
  requiredFunc: (evaluator: IFormEvaluator<T>) => boolean
  activeFunc: (evaluator: IFormEvaluator<T>) => boolean
}
