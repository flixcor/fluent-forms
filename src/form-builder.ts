import set from 'set-value'
import get from 'get-value'
import {
  FormGroup,
  Form,
  FormState,
  FormQuestion,
  FormConfig,
  GroupConfiguratorEquivalent,
  GroupState,
  IFormBuilder,
} from './types'

const isInteger = (s: string): boolean => /^-{0,1}\d+$/.test(s)

type FormProxy<
  TForm extends Form,
  TFormGroup extends FormGroup
> = GroupConfiguratorEquivalent<TForm, TFormGroup> &
  GroupState<TForm, TFormGroup>

type FormEvaluation<TForm extends Form> = (
  form: GroupState<TForm, TForm>,
  index: number
) => boolean
type boolFunc<T> = (arg: T) => boolean

function createProxy<TFormGroup extends FormGroup, TForm extends FormGroup>(
  obj: TFormGroup,
  path: Array<string> = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = (obj as unknown) as TForm,
  state = {} as FormState<TForm>,
  isRoot = true
): FormProxy<TForm, TFormGroup> {
  const ret = new Proxy(obj, {
    get(target: TFormGroup, key: string, receiver: unknown) {
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
          state,
          receiver
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
        typeof prop === 'object' || Array.isArray(prop)
          ? (prop as TFormGroup)
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
  state: FormState<TForm>,
  receiver: unknown
) {
  const lastNumberIndex: number = path
    .map((x) => isInteger(x))
    .lastIndexOf(true)

  const index =
    lastNumberIndex >= 0 ? Number.parseInt(path[lastNumberIndex]) : undefined

  const currentPathString = path.join('.')
  const safePath = path.filter((x) => !isInteger(x))

  const isActive = () =>
    isActiveRecursive(safePath, (s: string) =>
      getOrDefault(activeFuncs, s, () => true)(index)
    )

  const isRequired = () =>
    isRequiredRecursive(safePath, (s: string) =>
      getOrDefault(requiredFuncs, s, () => false)(index)
    )

  const value = () => get(root, currentPathString)

  const options: Record<
    string,
    () =>
      | boolean
      | string
      | TForm
      | ((func: FormEvaluation<TForm>) => void)
      | ((func: (q: FormQuestion) => boolean) => boolean)
      | ((i: number) => void)
      | ((val: unknown) => void)
      | ((val: unknown, i: number) => void)
  > = {
    $isProxy: () => true,
    $root: () => root,
    $path: () => currentPathString,
    $value: value,
    $isRequiredWhen: () => (func: FormEvaluation<TForm>) => {
      requiredFuncs.set(currentPathString, (i: number | undefined) =>
        func(state, typeof i === 'undefined' ? -1 : i)
      )
      return receiver
    },
    $isActiveWhen: () => (func: FormEvaluation<TForm>) => {
      activeFuncs.set(currentPathString, (i: number | undefined) =>
        func(state, typeof i === 'undefined' ? -1 : i)
      )
      return receiver
    },
    $isRequired: isRequired,
    $isActive: isActive,
    $isActiveAnd: () => (func: (q: FormQuestion) => boolean) => {
      return isActive() && func(value())
    },
    $append: () => (val: unknown) => {
      const arr = value()
      if (Array.isArray(arr)) {
        arr.push(val)
      }
    },
    $remove: () => (i: number) => {
      const arr = value()
      if (Array.isArray(arr)) {
        arr.splice(i, 1)
      }
    },
    $insert: () => (val: unknown, i: number) => {
      const arr = value()
      if (Array.isArray(arr)) {
        arr.splice(i, 0, val)
      }
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

function isActiveRecursive(
  path: string[],
  isActiveFunc: (p: string) => boolean,
  level = 0
): boolean {
  if (level >= path.length) {
    return true
  }

  const pathToCheck = path.slice(0, level + 1).join('.')
  return (
    isActiveFunc(pathToCheck) &&
    isActiveRecursive(path, isActiveFunc, level + 1)
  )
}

function isRequiredRecursive(
  path: string[],
  isRequiredFunc: (p: string) => boolean,
  level = 0
): boolean {
  if (level >= path.length) {
    return false
  }

  const pathToCheck = path.slice(0, level).join('.')

  return (
    isRequiredFunc(pathToCheck) ||
    isActiveRecursive(path, isRequiredFunc, level + 1)
  )
}

export function createFormBuilder<T extends Form>(form: T): IFormBuilder<T> {
  const proxy = createProxy(form)
  const ret: IFormBuilder<T> = {
    getState(): FormState<T> {
      return proxy
    },
    getConfigurator(): FormConfig<T> {
      return (proxy as unknown) as FormConfig<T>
    },
    getForm(): T {
      return form
    },
  }
  return ret
}
