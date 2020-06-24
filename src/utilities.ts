import { IRecurringGroupBuilder } from './recurring-groups'
import { FormGroup, Form } from './types'
import { IFormElementBuilderInternal } from './form-element-builder'

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

  str = str.replaceAll('[', '.').replaceAll(']', '')

  return str
}

export function isGroupBuilder(
  object: any
): object is IRecurringGroupBuilder<FormGroup> {
  return object.discriminator === 'recurring'
}

export function isElementBuilder<TForm extends Form>(
  object: any
): object is IFormElementBuilderInternal<TForm> {
  return object.discriminator === 'element'
}
