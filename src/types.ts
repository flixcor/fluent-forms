export type FormQuestion = string | number | (string | number)[]
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | RecurringGroup<FormGroup>
export type Form = Record<string, FormElement>
export type RecurringGroup<T extends FormGroup> = [T, ...T[]]
export type FormState<T extends Form> = GroupState<T, T>
export type FormConfig<T extends Form> = GroupConfiguratorEquivalent<T, T>

export interface IFormBuilder<T extends Form> {
  getState: () => FormState<T>
  getConfigurator: () => FormConfig<T>
  getForm: () => T
}

export type GroupState<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupState<T, I[key]>
    : I[key] extends FormGroup[]
    ? ReadonlyArray<GroupState<T, I[key][0]>> & IArrayOperations<I[key][0]>
    : I[key] extends FormQuestion
    ? IQuestionState<I[key]>
    : never
} &
  IFormStateObject

export type RecurringConfigurator<I extends FormGroup[]> = {
  [key in keyof I[0]]: I[0][key] extends FormGroup[]
    ? RecurringConfigurator<I[0][key]>
    : I[0][key] extends FormQuestion | FormGroup
    ? IGroupElementBuilder<I[0]>
    : never
} &
  IGroupElementBuilder<I[0]>

export type GroupConfiguratorEquivalent<T extends Form, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupConfiguratorEquivalent<T, I[key]>
    : I[key] extends FormGroup[]
    ? RecurringConfigurator<I[key]>
    : I[key] extends FormQuestion
    ? IFormElementBuilder<T>
    : never
} &
  IFormElementBuilder<T>

export interface IArrayOperations<T extends FormGroup> {
  $append: (group: T) => void
  $remove: (index: number) => void
  $insert: (index: number, group: T) => void
}

export interface IQuestionState<T extends FormElement>
  extends IFormStateObject {
  $value: T
  $isActiveAnd: (evaluation: (value: T) => boolean) => boolean
}

export interface IFormStateObject {
  readonly $isActive: boolean
  readonly $isRequired: boolean
  readonly $path: string
}

export interface IFormElementBuilder<TForm extends Form> {
  $isRequiredWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm>
  $isActiveWhen(
    func: (form: FormState<TForm>) => boolean
  ): IFormElementBuilder<TForm>
}

export interface IGroupElementBuilder<TGroup extends FormGroup> {
  $isRequiredWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
  $isActiveWhen(
    func: (form: FormState<TGroup>, index: number) => boolean
  ): IGroupElementBuilder<TGroup>
}
