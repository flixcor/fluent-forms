import { IFormElementBuilder } from './form-element-builder'
import { IGroupElementBuilder } from './recurring-groups'

export type FormQuestion = string | number | (string | number)[]
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | FormGroup[]
export type Form = Record<string, FormElement>

export type Builder<T extends Form> =
  | IFormElementBuilder<T>
  | IGroupElementBuilder<T>
