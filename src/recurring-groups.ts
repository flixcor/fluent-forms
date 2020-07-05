import { FormGroup, FormState } from './types'

export interface IGroupElementBuilderInternal<TForm extends FormGroup> {
  _isRequired: (form: FormState<TForm>, index: number) => boolean
  _isActive: (form: FormState<TForm>, index: number) => boolean
}

export class GroupElementBuilder<TGroup extends FormGroup>
  implements
    IGroupElementBuilderInternal<TGroup>,
    IGroupElementBuilder<TGroup> {
  path: string
  _isRequired: (form: FormState<TGroup>, index: number) => boolean = () => false
  _isActive: (form: FormState<TGroup>, index: number) => boolean = () => true

  constructor(path: string) {
    this.path = path
  }

  public $isRequired(
    func: (form: FormState<TGroup>, index: number) => boolean = (): boolean =>
      true
  ): IGroupElementBuilder<TGroup> {
    this._isRequired = func
    return this
  }

  public $isActive(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup> {
    this._isActive = func
    return this
  }
}

export interface IGroupElementBuilder<TGroup extends FormGroup> {
  $isRequired(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
  $isActive(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
}
