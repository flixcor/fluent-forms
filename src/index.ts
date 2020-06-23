export type FormQuestion = string | number | (string | number)[]
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | FormGroup[]
export type Form = Record<string, FormElement>

interface IFormElementBuilderInternal<TForm extends Form> {
  _isRequired: (form: IFormEvaluator<TForm>) => boolean
  _isActive: (form: IFormEvaluator<TForm>) => boolean
}

const getPathString = function (path: (x: any) => any) {
  let str = path.toString()
  str = str.substring(str.indexOf('.') + 1)

  if (str.includes('\n')) {
    str = str.substring(0, str.indexOf('\n'))
  }

  if (str.includes(';')) {
    str = str.substring(0, str.indexOf(';'))
  }

  if (str.includes('}')) {
    str = str.substring(0, str.indexOf('}'))
  }

  return str
}

class RecurringGroupBuilder<TForm extends Form, TGroup extends FormGroup>
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

export interface IRecurringGroupBuilder<T extends FormGroup> {
  question<Qt extends FormQuestion>(
    path: (x: T) => Qt
  ): FormElementBuilder<T, Qt>
}

interface IFormElementBuilder<TForm extends Form> {
  isRequired(
    func: (form: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilderInternal<TForm>
  isActive(
    func: (form: IFormEvaluator<TForm>) => boolean
  ): IFormElementBuilderInternal<TForm>
}

class GroupElementBuilder<TForm extends FormGroup, TElement extends FormElement>
  implements IFormElementBuilderInternal<TForm>, IFormElementBuilder<TForm> {
  path: (x: TForm) => TElement
  _isRequired: (form: IFormEvaluator<TForm>) => boolean = () => false
  _isActive: (form: IFormEvaluator<TForm>) => boolean = () => true

  constructor(path: (x: TForm) => TElement) {
    this.path = path
  }

  public isRequired(
    func: (form: IFormEvaluator<TForm>) => boolean = () => true
  ) {
    this._isRequired = func
    return this
  }

  public isActive(func: (form: IFormEvaluator<TForm>) => boolean) {
    this._isActive = func
    return this
  }
}

class FormElementBuilder<TForm extends Form, TElement extends FormElement>
  implements IFormElementBuilderInternal<TForm>, IFormElementBuilder<TForm> {
  path: (x: TForm) => TElement
  _isRequired: (form: IFormEvaluator<TForm>) => boolean = () => false
  _isActive: (form: IFormEvaluator<TForm>) => boolean = () => true

  constructor(path: (x: TForm) => TElement) {
    this.path = path
  }

  public isRequired(
    func: (form: IFormEvaluator<TForm>) => boolean = () => true
  ) {
    this._isRequired = func
    return this
  }

  public isActive(func: (form: IFormEvaluator<TForm>) => boolean) {
    this._isActive = func
    return this
  }
}

export interface IFormBuilder<T extends Form> {
  setValue<Qt extends FormQuestion>(path: (x: T) => Qt, value: Qt): void

  getStatus<Qt extends FormElement>(path: (x: T) => Qt): IFormElementStatus

  question<Qt extends FormQuestion>(
    path: (x: T) => Qt
  ): FormElementBuilder<T, Qt>

  group<Gt extends FormGroup>(path: (x: T) => Gt): FormElementBuilder<T, Gt>

  recurringGroup<Gt extends FormGroup>(
    path: (x: T) => Gt[]
  ): RecurringGroupBuilder<T, Gt>
}

interface IFormEvaluator<T extends Form> {
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

class FormBuilder<T extends Form>
  implements IFormEvaluator<T>, IFormBuilder<T> {
  private form: T

  private questionBuilders: Record<string, IFormElementBuilderInternal<T>> = {}

  constructor(form: T) {
    this.form = form
  }
  recurringGroup<Gt extends FormGroup>(
    path: (x: T) => Gt[]
  ): RecurringGroupBuilder<T, Gt> {
    throw new Error('Method not implemented.')
  }

  evaluate<TE extends FormElement>(
    path: (x: T) => TE,
    evaluation: (x: TE) => boolean
  ): boolean {
    const pathString = getPathString(path)
    return this.isActiveRecursive(pathString) && evaluation(path(this.form))
  }

  public question<Qt extends FormQuestion>(path: (x: T) => Qt) {
    return this.getElementBuilder(path)
  }

  public group<Gt extends FormGroup>(path: (x: T) => Gt) {
    return this.getElementBuilder(path)
  }

  public getStatus<Qt extends FormElement>(path: (x: T) => Qt) {
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

export function createFormBuilder<T extends Form>(form: T): IFormBuilder<T> {
  return <IFormBuilder<T>>new FormBuilder(form)
}
