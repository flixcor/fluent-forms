import { Form, FormElement, FormGroup, FormQuestion } from './types'
import { IFormEvaluator } from './form-builder'
import { getPathString } from './utilities'

interface IGroupElementBuilderInternal<TForm extends FormGroup> {
  _isRequired: (index: number, form: IFormEvaluator<TForm>) => boolean
  _isActive: (index: number, form: IFormEvaluator<TForm>) => boolean
}

export class RecurringGroupBuilder<TForm extends Form, TGroup extends FormGroup>
  implements IRecurringGroupBuilder<TGroup> {
  path: (x: TForm) => TGroup[]
  groupElementBuilders: Record<string, IGroupElementBuilder<TGroup>> = {}

  constructor(path: (x: TForm) => TGroup[]) {
    this.path = path
  }

  public question<Qt extends FormQuestion>(
    path: (x: TGroup) => Qt
  ): GroupElementBuilder<TGroup, Qt> {
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
  ): GroupElementBuilder<TGroup, TQuestion>
}

export interface IGroupElementBuilder<TForm extends FormGroup> {
  isRequired(
    func: (index: number, form: IFormEvaluator<TForm>) => boolean
  ): IGroupElementBuilder<TForm>
  isActive(
    func: (index: number, form: IFormEvaluator<TForm>) => boolean
  ): IGroupElementBuilder<TForm>
}
