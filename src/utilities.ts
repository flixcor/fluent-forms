import { IGroupElementBuilderInternal } from './recurring-groups'
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

  return str
}

export function isGroupBuilder<TGroup extends FormGroup, TForm extends Form>(
  object: any
): object is IGroupElementBuilderInternal<TGroup> {
  return object.discriminator === 'two-arg'
}

export function isElementBuilder<TGroup extends FormGroup, TForm extends Form>(
  object: any
): object is IFormElementBuilderInternal<TGroup> {
  return object.discriminator === 'one-arg'
}
