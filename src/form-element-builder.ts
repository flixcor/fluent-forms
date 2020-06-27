import { IFormEvaluator, FormStateObject } from './form-builder'
import { Form, FormElement } from './types'

export interface IFormElementBuilderInternal<TForm extends Form> {
  _isRequired: (form: IFormEvaluator<TForm>) => boolean
  _isActive: (form: IFormEvaluator<TForm>) => boolean
}

export interface IFormElementBuilder<TForm extends Form> {
  isRequired(
    func: (evaluator: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilder<TForm>
  isActive(
    func: (evaluator: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilder<TForm>
}

export class FormElementBuilder<
  TForm extends Form,
  TElement extends FormElement
> implements IFormElementBuilderInternal<TForm>, IFormElementBuilder<TForm> {
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

export class FormElementBuilderV2<TForm extends Form>
  implements IFormElementBuilder<TForm> {
  state: FormStateObject<TForm>
  evaluator: IFormEvaluator<TForm>

  constructor(state: FormStateObject<TForm>, evaluator: IFormEvaluator<TForm>) {
    this.state = state
    this.evaluator = evaluator
  }

  public isRequired(
    func: (form: IFormEvaluator<TForm>) => boolean = (): boolean => true
  ): IFormElementBuilder<TForm> {
    this.state['@requiredFunc'] = func
    this.state['@required'] = func(this.evaluator)
    return this
  }

  public isActive(
    func: (form: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilder<TForm> {
    this.state['@activeFunc'] = func
    this.state['@active'] = func(this.evaluator)
    return this
  }
}
