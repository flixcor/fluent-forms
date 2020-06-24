import { Form, FormQuestion, FormElement, FormGroup } from './types'
import { getPathString } from './utilities'
import {
  IFormElementBuilderInternal,
  FormElementBuilder,
  IFormElementBuilder,
} from './form-element-builder'
import {
  IRecurringGroupBuilder,
  RecurringGroupBuilder,
} from './recurring-groups'

export interface IFormBuilder<T extends Form> {
  setValue<Qt extends FormQuestion>(path: (x: T) => Qt, value: Qt): void

  getStatus<Qt extends FormElement>(path: (x: T) => Qt): IFormElementStatus

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

export interface IFormElementStatus {
  active: boolean
  required: boolean
  value: FormElement
  path: string
}

export class FormBuilder<T extends Form>
  implements IFormEvaluator<T>, IFormBuilder<T> {
  private form: T

  private questionBuilders: Record<string, IFormElementBuilderInternal<T>> = {}

  constructor(form: T) {
    this.form = form
  }
  recurringGroup<Gt extends FormGroup>(
    path: (x: T) => Gt[]
  ): IRecurringGroupBuilder<Gt> {
    //TODO: add to list of builders
    return new RecurringGroupBuilder(path)
  }

  evaluate<TE extends FormElement>(
    path: (x: T) => TE,
    evaluation: (x: TE) => boolean
  ): boolean {
    const pathString = getPathString(path)
    return this.isActiveRecursive(pathString) && evaluation(path(this.form))
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
  ): IFormElementStatus {
    const builder = this.getElementBuilder(path)
    const pathStr = getPathString(path)

    return {
      required: builder._isRequired(this),
      active: this.isActiveRecursive(pathStr),
      value: path(this.form),
      path: pathStr,
    }
  }

  private isActiveRecursive(path: string, level = 1): boolean {
    const split = path.split('.')

    if (level > split.length) {
      return true
    }

    const currentPath = split.slice(0, level).join('.')

    const builder = this.questionBuilders[currentPath]

    if (builder && !builder._isActive(this)) {
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

  public setValue<Qt extends FormQuestion>(
    path: (x: T) => Qt,
    value: Qt
  ): void {
    const setDeepValue = (
      propertyPath: string[] | string,
      value: Qt,
      obj: any
    ): boolean => {
      // this is a super simple parsing, you will want to make this more complex to handle correctly any path
      // it will split by the dots at first and then simply pass along the array (on next iterations)
      const properties = Array.isArray(propertyPath)
        ? propertyPath
        : propertyPath.split('.')

      // Not yet at the last property so keep digging
      if (properties.length > 1) {
        // The property doesn't exists OR is not an object (and so we overwritte it) so we create it
        if (
          !Object.prototype.hasOwnProperty.call(obj, properties[0]) ||
          typeof obj[properties[0]] !== 'object'
        )
          obj[properties[0]] = {}
        // We iterate.
        return setDeepValue(properties.slice(1), value, obj[properties[0]])
        // This is the last property - the one where to set the value
      } else {
        // We set the value to the last property
        obj[properties[0]] = value
        return true // this is the end
      }
    }
    const pathStr = getPathString(path)
    setDeepValue(pathStr, value, this.form)
  }
}