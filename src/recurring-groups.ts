import { Form, FormElement, FormGroup, FormQuestion } from './types'
import { IFormElementBuilder, FormElementBuilder } from './form-element-builder'
import { IFormEvaluator } from './form-builder'

export class RecurringGroupBuilder<TForm extends Form, TGroup extends FormGroup>
  implements IRecurringGroupBuilder<TGroup> {
  path: (x: TForm) => TGroup[]
  groupElementBuilders: Record<string, IFormElementBuilder<TGroup>> = {}

  constructor(path: (x: TForm) => TGroup[]) {
    this.path = path
  }

  public question<Qt extends FormQuestion>(path: (x: TGroup) => Qt) {
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
}

class GroupElementBuilder<TForm extends FormGroup, TElement extends FormElement>
  implements IFormElementBuilderInternal<TForm>, IFormElementBuilder<TForm> {
  path: (x: TForm) => TElement
  _isRequired: (index: number, form: IFormEvaluator<TForm>) => boolean = () =>
    false
  _isActive: (index: number, form: IFormEvaluator<TForm>) => boolean = () =>
    true

  constructor(path: (x: TForm) => TElement) {
    this.path = path
  }

  public isRequired(
    func: (index: number, form: IFormEvaluator<TForm>) => boolean = () => true
  ) {
    this._isRequired = func
    return this
  }

  public isActive(
    func: (index: number, form: IFormEvaluator<TForm>) => boolean
  ) {
    this._isActive = func
    return this
  }
}

export interface IRecurringGroupBuilder<T extends FormGroup> {
  question<Qt extends FormQuestion>(
    path: (x: T) => Qt
  ): FormElementBuilder<T, Qt>
}
