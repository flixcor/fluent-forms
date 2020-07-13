import set from 'set-value'
import get from 'get-value'
import { FormGroup, Form, FormState } from './types'
import { GroupConfiguratorEquivalent, GroupState } from './form-builder'

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
  path: Array<string | number> = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = (obj as unknown) as TForm,
  state = {} as FormState<TForm>,
  isRoot = true
): FormProxy<TForm, TFormGroup> {
  const ret = new Proxy(obj, {
    get(target: TFormGroup, key: string | number, receiver: any) {
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

      if (!(key in target)) throw 'key ' + key + ' not found'

      const prop = target[key]
      const newPath = [...path, key]

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
      target: TFormGroup,
      key: string | number,
      value: unknown,
      receiver: dollars<TFormGroup>
    ) {
      if (key === '$value') {
        const path = target.$path
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
  path: Array<string | number>,
  requiredFuncs: Map<string, (index: number | undefined) => boolean>,
  activeFuncs: Map<string, (index: number | undefined) => boolean>,
  root: TForm,
  state: FormState<TForm>
) {
  const lastNumberIndex: number = path
    .map((x) => typeof x === 'number')
    .lastIndexOf(true)

  let index: number | undefined = undefined
  let currentPathString = path.join('.')

  if (lastNumberIndex >= 0) {
    index = path[lastNumberIndex] as number
    currentPathString = path.slice(0, lastNumberIndex).join('.')
  }

  const options: Record<
    string,
    () =>
      | boolean
      | string
      | TForm
      | ((func: boolFunc<FormState<TForm>>) => void)
  > = {
    $isProxy: () => true,
    $root: () => root,
    $path: () => currentPathString,
    $value: () => get(root, currentPathString),
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
    $isRequired: () =>
      getOrDefault(requiredFuncs, currentPathString, () => false)(index),
    $isActive: () =>
      getOrDefault(activeFuncs, currentPathString, () => true)(index),
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

type config<T> = {
  $isRequiredWhen: (a: boolFunc<T>) => config<T>
  $isActiveWhen: (a: boolFunc<T>) => config<T>
}

type state<T> = {
  $isRequired: boolean
  $isActive: boolean
  $path: string
  $value: T
}

export type dollars<T> = config<T> & state<T>
