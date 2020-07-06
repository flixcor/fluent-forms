import { FormGroup, FormState } from './types'

export interface IGroupElementBuilderInternal<TForm extends FormGroup> {
  _isRequired: (form: FormState<TForm>, index: number) => boolean
  _isActive: (form: FormState<TForm>, index: number) => boolean
}

export class GroupElementBuilder<TGroup extends FormGroup>
  implements
    IGroupElementBuilderInternal<TGroup>,
    IGroupElementBuilder<TGroup> {
  $path: string
  _isRequired: (form: FormState<TGroup>, index: number) => boolean = () => false
  _isActive: (form: FormState<TGroup>, index: number) => boolean = () => true

  constructor(path: string) {
    this.$path = path
  }

  public $isRequiredWhen(
    func: (form: FormState<TGroup>, index: number) => boolean = (): boolean =>
      true
  ): IGroupElementBuilder<TGroup> {
    this._isRequired = func
    return this
  }

  public $isActiveWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup> {
    this._isActive = func
    return this
  }
}

export interface IGroupElementBuilder<TGroup extends FormGroup> {
  $isRequiredWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
  $isActiveWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
}
