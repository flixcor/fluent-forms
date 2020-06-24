import { IFormEvaluator } from './form-builder'
import { Form, FormElement } from './types'

export interface IFormElementBuilderInternal<TForm extends Form> {
  discriminator: 'element'
  _isRequired: (form: IFormEvaluator<TForm>) => boolean
  _isActive: (form: IFormEvaluator<TForm>) => boolean
}

export interface IFormElementBuilder<TForm extends Form> {
  isRequired(
    func: (form: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilder<TForm>
  isActive(
    func: (form: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilder<TForm>
}

export class FormElementBuilder<
  TForm extends Form,
  TElement extends FormElement
> implements IFormElementBuilderInternal<TForm>, IFormElementBuilder<TForm> {
  discriminator: 'element' = 'element'
  path: (x: TForm) => TElement
  _isRequired: (form: IFormEvaluator<TForm>) => boolean = () => false
  _isActive: (form: IFormEvaluator<TForm>) => boolean = () => true

  constructor(path: (x: TForm) => TElement) {
    this.path = path
  }

  public isRequired(
    func: (form: IFormEvaluator<TForm>) => boolean = (): boolean => true
  ): IFormElementBuilder<TForm> {
    this._isRequired = func
    return this
  }

  public isActive(
    func: (form: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilder<TForm> {
    this._isActive = func
    return this
  }
}
