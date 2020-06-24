export type FormQuestion = string | number | (string | number)[]
export type FormGroup = {
  [key: string]: FormElement
}
export type FormElement = FormQuestion | FormGroup | FormGroup[]
export type Form = Record<string, FormElement>
