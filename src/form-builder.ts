import setValue from 'set-value'
import getValue from 'get-value'
import {
  FormGroup,
  Form,
  FormState,
  FormQuestion,
  FormConfig,
  GroupConfiguratorEquivalent,
  GroupState,
  IFormBuilder,
  IArrayOperations,
  FormElement,
} from './types'

const isInteger = (s: unknown): boolean =>
  typeof s === 'string' && /^-{0,1}\d+$/.test(s)

type FormProxy<
  TForm extends Form,
  TFormGroup extends FormGroup
> = GroupConfiguratorEquivalent<TForm, TFormGroup> &
  GroupState<TForm, TFormGroup>

type FormEvaluation<TForm extends Form> = (
  form: GroupState<TForm, TForm>,
  index: number
) => boolean

type EnhancementFuncs = AsFunc<Enhancements & IArrayOperations<FormGroup>>

const ignoreList = [
  '_vm',
  'state',
  'getters',
  '_isVue',
  'render',
  'toJSON',
  'length',
  '__proto__',
]

function createProxy(
  obj: FormGroup,
  path: Array<string> = [],
  requiredFuncs = new Map<string, () => boolean>(),
  activeFuncs = new Map<string, () => boolean>(),
  root = (obj as unknown) as Form,
  state = {} as FormState<Form>,
  isRoot = true,
  enhancementMap = new Map<string, EnhancementFuncs>(),
  proxyMap = new Map<string, FormProxy<Form, FormGroup>>()
): FormProxy<Form, FormGroup> {
  if (isRoot) {
    const clone = Object.create(null)
    Object.assign(clone, root)
    root = clone
  }

  const ret = new Proxy(obj, {
    get(target: FormGroup, key: string | number | symbol, receiver: unknown) {
      if (
        typeof key === 'symbol' ||
        ignoreList.includes(key.toString()) ||
        key.toString().startsWith('_') ||
        (Array.isArray(target) && key in []) ||
        key in {}
      ) {
        return Reflect.get(target, key, receiver)
      }

      key = key.toString()

      if (key.startsWith('$')) {
        const enhancements = getEnhancements(
          path,
          requiredFuncs,
          activeFuncs,
          root,
          state,
          receiver
        )
        const option = enhancements[key]
        const val = option && option()
        return val
      }

      const newPath = [...path, key]

      let prop = Reflect.get(target, key, receiver)
      if (typeof prop === 'undefined') {
        prop = Object.create(null)
      }

      if (
        typeof prop === 'string' ||
        typeof prop === 'number' ||
        (Array.isArray(prop) &&
          (typeof prop[0] === 'number' || typeof prop[0] === 'string'))
      ) {
        prop = Object.create(null)
      }

      return createProxy(
        Object.create(prop),
        newPath,
        requiredFuncs,
        activeFuncs,
        root,
        state,
        false,
        enhancementMap,
        proxyMap
      )

      // return getOrDefault(proxyMap, newPathStr, () => {
      //   if (typeof prop === 'object' || Array.isArray(prop)) {
      //     const ding = Reflect.get(target, key, receiver)
      //     return createProxy(
      //       ding,
      //       newPath,
      //       requiredFuncs,
      //       activeFuncs,
      //       root,
      //       state,
      //       false
      //     )
      //   }

      //   const enhancements = getOrDefault(enhancementMap, newPathStr, () =>
      //     getEnhancements(
      //       newPath,
      //       requiredFuncs,
      //       activeFuncs,
      //       root,
      //       state,
      //       receiver
      //     )
      //   )
      //   return new QuestionProxy(enhancements)
      // })
    },
    set(
      _target: unknown,
      key: string | number | symbol,
      value: unknown,
      receiver: Record<PropertyKey, unknown>
    ) {
      if (key === '$value' && hasOwnProperty(receiver, '$path', '')) {
        setValue(root, receiver.$path, value)
      }
      return true
    },
  })
  if (isRoot) {
    Object.assign(state, ret)
  }
  return (ret as unknown) as FormProxy<Form, FormGroup>
}

function hasOwnProperty<Y extends PropertyKey, Z>(
  obj: Record<Y, unknown>,
  prop: Y,
  sampleVal: Z
): obj is Record<Y, Z> {
  const val = obj[prop]
  return typeof val === typeof sampleVal
}

// class QuestionProxy {
//   private _safePath: string[]
//   private _index: number
//   private _root: Record<string, FormElement>
//   private _state: GroupState<
//     Record<string, FormElement>,
//     Record<string, FormElement>
//   >
//   private _requiredFuncs: Map<string, (index: number | undefined) => boolean>
//   private _activeFuncs: Map<string, (index: number | undefined) => boolean>
//   $path: string
//   private _safePathString: string
//   private _currentValue: any

//   constructor(
//     path: Array<string>,
//     requiredFuncs: Map<string, (index: number | undefined) => boolean>,
//     activeFuncs: Map<string, (index: number | undefined) => boolean>,
//     root: Form,
//     state: FormState<Form>
//   ) {
//     const lastNumberIndex: number = path
//       .map((x) => isInteger(x))
//       .lastIndexOf(true)

//     this._safePath = path.filter((x) => !isInteger(x))
//     this._safePathString = this._safePath.join('.')
//     this._index =
//       lastNumberIndex >= 0 ? Number.parseInt(path[lastNumberIndex]) : -1
//     this.$path = path.join('.')
//     this._root = root
//     this._state = state
//     this._requiredFuncs = requiredFuncs
//     this._activeFuncs = activeFuncs
//     this._currentValue = getValue(this._root, this.$path)
//   }

//   public get $value(): any {
//     return this._currentValue
//   }

//   public set $value(value) {
//     setValue(this._root, this.$path, value)
//   }

//   public $isRequiredWhen(func: FormEvaluation<Form>) {
//     this._requiredFuncs.set(this._safePathString, (i: number | undefined) =>
//       func(this._state, typeof i === 'undefined' ? -1 : i)
//     )
//     return this
//   }

//   public $isActiveWhen(func: FormEvaluation<Form>) {
//     this._activeFuncs.set(this._safePathString, (i: number | undefined) =>
//       func(this._state, typeof i === 'undefined' ? -1 : i)
//     )
//     return this
//   }

//   public get $isRequired() {
//     return isRequiredRecursive(this._safePath, (s: string) =>
//       getOrDefault(this._requiredFuncs, s, () => () => false)(this._index)
//     )
//   }

//   public get $isActive() {
//     return isActiveRecursive(this._safePath, (s: string) =>
//       getOrDefault(this._activeFuncs, s, () => () => true)(this._index)
//     )
//   }

//   public $isActiveAnd(func: (q: FormQuestion) => boolean) {
//     return this.$isActive && func(this.$value)
//   }
// }

type AsFunc<T> = {
  [key in keyof T]: () => T[key]
}

type Enhancements = {
  $isProxy: boolean
  $root: Form
  $path: string
  $value: unknown
  $isRequiredWhen: (func: FormEvaluation<Form>) => unknown
  $isActiveWhen: (func: FormEvaluation<Form>) => unknown
  $isRequired: boolean
  $isActive: boolean
  $isActiveAnd: (func: (q: FormQuestion) => boolean) => boolean
} & Record<string, unknown>

function getEnhancements(
  path: Array<string>,
  requiredFuncs: Map<string, (index: number | undefined) => boolean>,
  activeFuncs: Map<string, (index: number | undefined) => boolean>,
  root: Form,
  state: FormState<Form>,
  receiver: unknown
) {
  const lastNumberIndex: number = path
    .map((x) => isInteger(x))
    .lastIndexOf(true)

  const index =
    lastNumberIndex >= 0 ? Number.parseInt(path[lastNumberIndex]) : undefined

  const currentPathString = path.join('.')
  const safePath = path.filter((x) => !isInteger(x))
  const safePathString = safePath.join('.')

  const isActive = () =>
    isActiveRecursive(safePath, (s: string) =>
      getOrDefault(activeFuncs, s, () => () => true)(index)
    )

  const isRequired = () =>
    isRequiredRecursive(safePath, (s: string) =>
      getOrDefault(requiredFuncs, s, () => () => false)(index)
    )

  const value = () => {
    const val = getValue(root, currentPathString)
    return val
  }

  const options: EnhancementFuncs = {
    $isProxy: () => true,
    $root: () => root,
    $path: () => currentPathString,
    $value: value,
    $isRequiredWhen: () => (func: FormEvaluation<Form>) => {
      requiredFuncs.set(safePathString, (i: number | undefined) =>
        func(state, typeof i === 'undefined' ? -1 : i)
      )
      return receiver
    },
    $isActiveWhen: () => (func: FormEvaluation<Form>) => {
      activeFuncs.set(safePathString, (i: number | undefined) =>
        func(state, typeof i === 'undefined' ? -1 : i)
      )
      return receiver
    },
    $isRequired: isRequired,
    $isActive: isActive,
    $isActiveAnd: () => (func: (q: FormQuestion) => boolean) => {
      const isA = isActive()
      const val = value()
      const evalSucceeded = func(val)
      return isA && evalSucceeded
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
    $insert: () => (i: number, val: FormGroup) => {
      const arr = value()
      if (Array.isArray(arr)) {
        arr.splice(i, 0, val)
      }
    },
  }
  return options
}

function getOrDefault<T, F>(map: Map<T, F>, index: T, otherwise: () => F): F {
  let found = map.get(index)
  if (typeof found === 'undefined') {
    found = otherwise()
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
      return (proxy as unknown) as FormState<T>
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
