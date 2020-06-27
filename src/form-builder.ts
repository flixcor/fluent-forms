import { Form, FormQuestion, FormElement, FormGroup, FormState } from './types'
import { getPathString, isElementBuilder } from './utilities'
import {
  FormElementBuilder,
  IFormElementBuilder,
  FormElementBuilderV2,
} from './form-element-builder'
import {
  IRecurringGroupBuilder,
  RecurringGroupBuilder,
} from './recurring-groups'
import set from 'set-value'

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

  getState: () => FormState

  getQuestionState<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormQuestionStatus<TQ>

  questionV2<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormElementBuilder<T>
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
  private state: FormState

  constructor(form: T) {
    this.form = form
    this.state = this.initializeFormState(form)
  }

  public getState: () => FormState = () => this.state

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
      '@active': true,
      '@required': false,
      '@activeFunc': (): boolean => true,
      '@path': path,
      '@requiredFunc': (): boolean => false,
    }
  }

  setQuestionProps(record: FormStateObject<T>): void {
    const safePath = record['@path'].replace(/\[/g, '.').replace(/\]/g, '')
    record['@set'] = (value: FormQuestion) => {
      set(this.form, safePath, value)
    }
  }

  public getQuestionState<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormQuestionStatus<TQ> {
    const fakedPath = <(state: any) => FormStateObject<T>>(<unknown>path)
    const obj = fakedPath(this.state)
    const value = path(this.form)

    return {
      value,
      active: obj['@active'],
      required: obj['@required'],
      path: obj['@path'],
      set: <(value: TQ) => void>obj['@set'],
    }
  }

  public questionV2<TQ extends FormQuestion>(
    path: (form: T) => TQ
  ): IFormElementBuilder<T> {
    const fakedPath = <(state: FormState) => FormStateObject<T>>(<unknown>path)
    const obj = fakedPath(this.state)

    return new FormElementBuilderV2(obj, this)
  }

  private initializeFormState(form: any, path = ''): any {
    const ret = this.buildStandardRecord(path)
    const dottedPath = path ? path + '.' : ''

    for (const key in form) {
      if (form.hasOwnProperty(key)) {
        const nextPath = dottedPath + key
        const element = form[key]
        if (Array.isArray(element)) {
          if (
            !element.length ||
            ['string', 'number'].includes(typeof element[0])
          ) {
            const innerElement = this.buildStandardRecord(nextPath)
            this.setQuestionProps(innerElement)
            ret[key] = innerElement
          } else {
            ret[key] = element.map((x, i) =>
              this.initializeFormState(x, `${nextPath}[${i}]`)
            )
          }
        } else if (['string', 'number'].includes(typeof element)) {
          const innerElement = this.buildStandardRecord(nextPath)
          this.setQuestionProps(innerElement)
          ret[key] = innerElement
        } else if (typeof element === 'object') {
          ret[key] = this.initializeFormState(element, nextPath)
        }
      }
    }
    return ret
  }
}

export type FormStateObject<T extends Form> = {
  [key: string]: unknown
  '@active': boolean
  '@required': boolean
  '@path': string
  '@requiredFunc': (evaluator: IFormEvaluator<T>) => boolean
  '@activeFunc': (evaluator: IFormEvaluator<T>) => boolean
}
