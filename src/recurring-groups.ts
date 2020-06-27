import { Form, FormElement, FormGroup, FormQuestion } from './types'
import { IFormEvaluator, IFormQuestionStatus } from './form-builder'
import { getPathString } from './utilities'
import set from 'set-value'

export interface IGroupElementBuilderInternal<TForm extends FormGroup> {
  _isRequired: (index: number, form: IFormEvaluator<TForm>) => boolean
  _isActive: (index: number, form: IFormEvaluator<TForm>) => boolean
}

class GroupEvaluator<TGroup extends FormGroup>
  implements IFormEvaluator<TGroup> {
  index: number
  getValue: () => TGroup[]
  constructor(index: number, getValue: () => TGroup[]) {
    this.index = index
    this.getValue = getValue
  }

  evaluate<TE extends FormElement>(
    path: (x: TGroup) => TE,
    evaluation: (x: TE) => boolean
  ): boolean {
    const value = this.getValue()[this.index]
    const question = path(value)
    return evaluation(question)
  }
}

export class RecurringGroupBuilder<TForm extends Form, TGroup extends FormGroup>
  implements IRecurringGroupBuilder<TGroup> {
  getValue: () => TGroup[]
  groupElementBuilders: Record<string, IGroupElementBuilder<TGroup>> = {}
  path: string

  constructor(getValue: () => TGroup[], path: string) {
    this.getValue = getValue
    this.path = path
  }

  public question<Qt extends FormQuestion>(
    path: (x: TGroup) => Qt
  ): IGroupElementBuilder<TGroup> {
    return this.getElementBuilder(path)
  }

  public group<Qt extends FormGroup>(
    path: (x: TGroup) => Qt
  ): IGroupElementBuilder<TGroup> {
    return this.getElementBuilder(path)
  }

  private getElementBuilder<Et extends FormElement>(path: (x: TGroup) => Et) {
    const pathStr = getPathString(path)

    let builder = <GroupElementBuilder<TGroup, Et>>(
      this.groupElementBuilders[pathStr]
    )

    if (!builder) {
      builder = new GroupElementBuilder<TGroup, Et>(path)
      this.groupElementBuilders[pathStr] = builder
    }

    return builder
  }

  public getStatus<Qt extends FormQuestion>(
    index: number,
    path: (x: TGroup) => Qt
  ): IFormQuestionStatus<Qt> {
    const builder = this.getElementBuilder(path)
    const pathStr = getPathString(path)
    const evaluator = new GroupEvaluator(index, this.getValue)
    const set = (value: Qt) => this.setValue(index, path, value)

    return {
      required: builder._isRequired(index, evaluator),
      active: builder._isActive(index, evaluator),
      value: path(this.getValue()[index]),
      path: `${this.path}[${index}].${pathStr}`,
      set,
    }
  }

  public count = (): number => this.getValue().length

  setValue<Qt extends FormQuestion>(
    index: number,
    path: (x: TGroup) => Qt,
    value: Qt
  ): void {
    const formGroup = this.getValue()[index]
    const pathStr = getPathString(path).replace(/\[/g, '.').replace(/\]/g, '')
    set(formGroup, pathStr, value)
  }
}

class GroupElementBuilder<
  TGroup extends FormGroup,
  TElement extends FormElement
>
  implements
    IGroupElementBuilderInternal<TGroup>,
    IGroupElementBuilder<TGroup> {
  path: (x: TGroup) => TElement
  _isRequired: (index: number, form: IFormEvaluator<TGroup>) => boolean = () =>
    false
  _isActive: (index: number, form: IFormEvaluator<TGroup>) => boolean = () =>
    true

  constructor(path: (x: TGroup) => TElement) {
    this.path = path
  }

  public isRequired(
    func: (index: number, form: IFormEvaluator<TGroup>) => boolean = () => true
  ) {
    this._isRequired = func
    return this
  }

  public isActive(
    func: (index: number, form: IFormEvaluator<TGroup>) => boolean
  ) {
    this._isActive = func
    return this
  }
}

export interface IRecurringGroupBuilder<TGroup extends FormGroup> {
  question<TQuestion extends FormQuestion>(
    path: (x: TGroup) => TQuestion
  ): IGroupElementBuilder<TGroup>
  getStatus<Qt extends FormQuestion>(
    index: number,
    path: (x: TGroup) => Qt
  ): IFormQuestionStatus<Qt>
  count(): number
}

export interface IGroupElementBuilder<TGroup extends FormGroup> {
  isRequired(
    func: (index: number, evaluator: IFormEvaluator<TGroup>) => boolean
  ): IGroupElementBuilder<TGroup>
  isActive(
    func: (index: number, evaluator: IFormEvaluator<TGroup>) => boolean
  ): IGroupElementBuilder<TGroup>
}
