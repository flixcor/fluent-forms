import { Form, FormQuestion, FormElement, FormGroup } from './types'
import { getPathString, isElementBuilder } from './utilities'
import { FormElementBuilder, IFormElementBuilder } from './form-element-builder'
import {
  IRecurringGroupBuilder,
  RecurringGroupBuilder,
} from './recurring-groups'
import set from 'set-value'

export interface IFormBuilder<T extends Form> {
  setValue<Qt extends FormQuestion>(path: (x: T) => Qt, value: Qt): void

  getStatus<Qt extends FormElement>(path: (x: T) => Qt): IFormElementStatus<Qt>

  question<Qt extends FormQuestion>(path: (x: T) => Qt): IFormElementBuilder<T>

  group<Gt extends FormGroup>(path: (x: T) => Gt): IFormElementBuilder<T>

  recurringGroup<Gt extends FormGroup>(
    path: (x: T) => Gt[]
  ): IRecurringGroupBuilder<Gt>
}

export interface IFormEvaluator<T extends Form> {
  evaluate<TE extends FormElement>(
    path: (x: T) => TE,
    evaluation: (x: TE) => boolean
  ): boolean
}

export interface IFormElementStatus<T extends FormElement> {
  active: boolean
  required: boolean
  value: T
  path: string
}

export class FormBuilder<T extends Form>
  implements IFormEvaluator<T>, IFormBuilder<T> {
  private form: T

  private questionBuilders: Record<string, unknown> = {}

  constructor(form: T) {
    this.form = form
  }

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

  public getStatus<Qt extends FormElement>(
    path: (x: T) => Qt
  ): IFormElementStatus<Qt> {
    const builder = this.getElementBuilder(path)
    const pathStr = getPathString(path)

    return {
      required: builder._isRequired(this),
      active: this.isActiveRecursive(pathStr),
      value: path(this.form),
      path: pathStr,
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
}
