import set from 'set-value'
import get from 'get-value'
import { FormGroup, Form, FormState, FormQuestion } from './types'
import { GroupConfiguratorEquivalent, GroupState } from './form-builder'

const isInteger = (s: string): boolean => /^-{0,1}\d+$/.test(s)

function cloneArray<T extends Array<unknown>>(arr: T): Array<unknown> {
  return arr.map((x) => {
    return typeof x === 'object' && !Array.isArray(x) ? Object.create(x) : x
  })
}

export type FormProxy<
  TForm extends Form,
  TFormGroup extends FormGroup
> = GroupConfiguratorEquivalent<TForm, TFormGroup> &
  GroupState<TForm, TFormGroup>

type FormEvaluation<TForm extends Form> = (
  form: GroupState<TForm, TForm>,
  index: number
) => boolean
type boolFunc<T> = (arg: T) => boolean

export function createProxy<
  TFormGroup extends FormGroup,
  TForm extends FormGroup
>(
  obj: TFormGroup,
  path: Array<string> = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = (obj as unknown) as TForm,
  state = {} as FormState<TForm>,
  isRoot = true
): FormProxy<TForm, TFormGroup> {
  const ret = new Proxy(obj, {
    get(target: TFormGroup, key: string) {
      if (key === 'length' && Array.isArray(target)) {
        return target.length
      }

      if (typeof key === 'string' && key.startsWith('$'))
        return getEnhancements(
          key,
          path,
          requiredFuncs,
          activeFuncs,
          root,
          state
        )

      let prop = target[key]
      const newPath = [...path, key]

      if (
        Array.isArray(target) &&
        target.length &&
        typeof target[0][key] !== 'undefined'
      ) {
        prop = target[0][key]
      }

      const propObj =
        typeof prop === 'object'
          ? Array.isArray(prop)
            ? ((cloneArray(prop) as unknown) as TFormGroup)
            : (Object.create(prop) as TFormGroup)
          : (Object.create(null) as TFormGroup)

      return createProxy(
        propObj,
        newPath,
        requiredFuncs,
        activeFuncs,
        root,
        state,
        false
      )
    },
    set(
      _target: TFormGroup,
      key: string | number,
      value: unknown,
      receiver: FormProxy<TForm, TFormGroup>
    ) {
      if (key === '$value') {
        const path = receiver.$path
        if (typeof path !== 'string') {
          throw 'could not find path for key ' + key
        }
        set(root, path, value)
        return true
      }

      throw 'set not supported for key ' + key
    },
  })
  if (isRoot) {
    Object.assign(state, ret)
  }
  return (ret as unknown) as FormProxy<TForm, TFormGroup>
}

function getEnhancements<TForm extends Form>(
  key: string,
  path: Array<string>,
  requiredFuncs: Map<string, (index: number | undefined) => boolean>,
  activeFuncs: Map<string, (index: number | undefined) => boolean>,
  root: TForm,
  state: FormState<TForm>
) {
  const lastNumberIndex: number = path
    .map((x) => isInteger(x))
    .lastIndexOf(true)

  let index = -1
  const currentPathString = path.join('.')
  let safePath = currentPathString

  if (lastNumberIndex >= 0) {
    index = Number.parseInt(path[lastNumberIndex])
    safePath = path.filter((x) => !isInteger(x)).join('.')
  }

  const isActive = () => getOrDefault(activeFuncs, safePath, () => true)(index)

  const value = () => get(root, currentPathString)

  const options: Record<
    string,
    () =>
      | boolean
      | string
      | TForm
      | ((func: FormEvaluation<TForm>) => void)
      | ((func: (q: FormQuestion) => boolean) => boolean)
  > = {
    $isProxy: () => true,
    $root: () => root,
    $path: () => currentPathString,
    $value: value,
    $isRequiredWhen: () => (func: FormEvaluation<TForm>) => {
      requiredFuncs.set(currentPathString, (i: number | undefined) =>
        func(state, typeof i === 'undefined' ? -1 : i)
      )
    },
    $isActiveWhen: () => (func: FormEvaluation<TForm>) => {
      activeFuncs.set(currentPathString, (i: number | undefined) =>
        func(state, typeof i === 'undefined' ? -1 : i)
      )
    },
    $isRequired: () => {
      const i = index
      const func = getOrDefault(requiredFuncs, safePath, () => false)
      return func(i)
    },
    $isActive: () => isActive(),
    $isActiveAnd: () => (func: (q: FormQuestion) => boolean) => {
      return isActive() && func(value())
    },
  }

  return options[key]()
}

function getOrDefault<T, F>(map: Map<T, F>, index: T, otherwise: F): F {
  let found = map.get(index)
  if (typeof found === 'undefined') {
    found = otherwise
    map.set(index, found)
  }
  return found
}
