import {
  IRecurringGroupBuilder,
  RecurringGroupBuilder,
} from './recurring-groups'
import { FormGroup, Form } from './types'
import {
  IFormElementBuilderInternal,
  FormElementBuilder,
} from './form-element-builder'

export const getPathString = function (path: (x: any) => any): string {
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

export function isGroupBuilder(
  object: unknown
): object is IRecurringGroupBuilder<FormGroup> {
  return object instanceof RecurringGroupBuilder
}

export function isElementBuilder<TForm extends Form>(
  object: unknown
): object is IFormElementBuilderInternal<TForm> {
  return object instanceof FormElementBuilder
}
