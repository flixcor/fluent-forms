import { Form } from './types'
import { IFormBuilder, FormBuilder } from './form-builder'
export { IFormBuilder, IFormQuestionStatus } from './form-builder'
export * from './types'

export function createFormBuilder<T extends Form>(form: T): IFormBuilder<T> {
  return new FormBuilder(form)
}
