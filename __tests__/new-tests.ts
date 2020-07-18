import { FormElement, RecursivePartial, FormConfig } from '../src'
import { buildFormState } from '../src/form-builder'

interface IGroup {
  [key: string]: FormElement
  question4: string
  group2: IGroup2
}

interface IGroup2 {
  [key: string]: FormElement
  question5: number
}

interface IMyForm {
  [key: string]: FormElement
  question1: string
  question2: number
  question3: number[]
  recurringGroup: IGroup[]
}

const config: FormConfig<IMyForm> = {
  question1: {},
  question2: {},
  question3: {
    $isActive(form) {
      return form.question2.$value <= 3
    },
  },
  recurringGroup: [
    {
      question4: {},
      group2: {
        question5: {},
      },
    },
  ],
}

const initial: RecursivePartial<IMyForm> = {}
const state = buildFormState(initial, config)

state.question1.$value = 'hoi'

state.recurringGroup.$append({
  question4: 'answer to question 4',
  group2: {
    question5: 5,
  },
})

state.question2.$value = 5

test('new tests', () => {
  expect(state.question1.$value).toBe('hoi')
  expect(initial.question1).toBe('hoi')
  expect(state.recurringGroup.length).toBe(1)
  expect(initial.recurringGroup?.length).toBe(1)
  expect(state.question3.$isActive).toBe(false)

  state.recurringGroup.$insert(0, {
    question4: 'answer to question 4',
    group2: {
      question5: 5,
    },
  })

  expect(state.recurringGroup[1].$path).toBe('recurringGroup.1')
})
