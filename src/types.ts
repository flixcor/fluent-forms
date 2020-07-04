import { GroupState, GroupConfiguratorEquivalent } from './form-builder'

export type FormQuestion = string | number | (string | number)[]
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | RecurringGroup<FormGroup>
export type Form = Record<string, FormElement>
export type RecurringGroup<T extends FormGroup> = [T, ...T[]]
export type FormState<T extends Form> = GroupState<T, T>
export type FormConfig<T extends Form> = GroupConfiguratorEquivalent<T, T>
