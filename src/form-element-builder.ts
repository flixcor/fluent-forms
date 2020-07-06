import { Form, FormState } from './types'

export interface IFormElementBuilderInternal<TForm extends Form> {
  _isRequired: (form: FormState<TForm>) => boolean
  _isActive: (form: FormState<TForm>) => boolean
}

export interface IFormElementBuilder<TForm extends Form> {
  $isRequiredWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm>
  $isActiveWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm>
}

export class FormElementBuilder<TForm extends Form>
  implements IFormElementBuilderInternal<TForm>, IFormElementBuilder<TForm> {
  $path: string
  _isRequired: (form: FormState<TForm>) => boolean = () => false
  _isActive: (form: FormState<TForm>) => boolean = () => true

  constructor(path: string) {
    this.$path = path
  }

  public $isRequiredWhen(
    func: (form: FormState<TForm>) => boolean = (): boolean => true
  ): IFormElementBuilder<TForm> {
    this._isRequired = func
    return this
  }

  public $isActiveWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm> {
    this._isActive = func
    return this
  }
}
