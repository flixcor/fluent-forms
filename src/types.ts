export type FormQuestion = string | number | Array<string | number> | FormFile
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | FormGroup[]
export type Form = Record<PropertyKey, FormElement>

export type FormFile = URL | URL[]

export interface IFormBuilder<T extends Form> {
  getState: () => FormState<T>
  getConfigurator: () => FormConfig<T>
  getForm: () => RecursivePartial<T>
}

export interface IArrayOperations<T> {
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

export type FormConfig<T extends FormGroup> = InBetween<T, T>

export type InBetween<T extends FormGroup, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupConfiguratorEquivalent<T, I[key]>
    : I[key] extends FormGroup[]
    ? [RecurringConfigurator<T, I[key][0]>]
    : I[key] extends FormQuestion
    ? IFormElementBuilder<T>
    : unknown
}

export type GroupConfiguratorEquivalent<
  T extends FormGroup,
  I extends FormGroup
> = InBetween<T, I> & IFormElementBuilder<T>

export type RecurringConfigurator<T extends FormGroup, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup[]
    ? [RecurringConfigurator<T, I[key][0]>]
    : I[key] extends FormGroup
    ? RecurringConfigurator<T, I[key]>
    : I[key] extends FormQuestion
    ? IGroupElementBuilder<T>
    : unknown
} &
  IGroupElementBuilder<T>

export interface IFormElementBuilder<TForm extends FormGroup> {
  $isRequired?: boolean | ((form: FormState<TForm>) => boolean)
  $isActive?: boolean | ((form: FormState<TForm>) => boolean)
}

export interface IGroupElementBuilder<TGroup extends FormGroup> {
  $isActive?: boolean | ((form: FormState<TGroup>, index: number) => boolean)
  $isRequired?: boolean | ((form: FormState<TGroup>, index: number) => boolean)
}

export type FormState<T extends FormGroup> = GroupState<T, T>

export type GroupState<T extends FormGroup, I extends FormGroup> = {
  [key in keyof I]: I[key] extends FormGroup
    ? GroupState<T, I[key]>
    : I[key] extends FormGroup[]
    ? ReadonlyArray<GroupState<T, I[key][0]>> & IArrayOperations<I[key][0]>
    : I[key] extends FormQuestion
    ? IQuestionState<I[key]>
    : never
} &
  IFormStateObject

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<unknown>
    ? RecursivePartial<T[P][0]>[]
    : T[P] extends Record<PropertyKey, unknown>
    ? RecursivePartial<T[P]>
    : T[P]
}
