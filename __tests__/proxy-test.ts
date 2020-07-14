/// <reference types="jest" />

import { Form, RecurringGroup, FormGroup, createFormBuilder } from '../src'

export interface IMyForm extends Form {
  question1: number
  question2: string
  group1: IGroup1
  recurringGroup: RecurringGroup<IGroup2>
}

interface IGroup1 extends FormGroup {
  question3: (number | string)[]
}

interface IGroup2 extends FormGroup {
  question4: string
}

function getForm(): IMyForm {
  return {
    question1: 5,
    question2: 'answer',
    group1: {
      question3: [22.5],
    },
    recurringGroup: [
      {
        question4: 'example',
      },
      {
        question4: 'example 2',
      },
    ],
  }
}

const builder = createFormBuilder(getForm())
const configurator = builder.getConfigurator()
const state = builder.getState()
const form = builder.getForm()

configurator.question1.$isRequiredWhen(() => true)

configurator.question2
  .$isActiveWhen((form) => form.question1.$isActiveAnd((x) => x > 3))
  .$isRequiredWhen(() => false)

configurator.group1.$isActiveWhen((form) =>
  form.question1.$isActiveAnd((x) => x <= 3)
)

configurator.group1.question3.$isActiveWhen(() => true)

configurator.recurringGroup.question4.$isRequiredWhen((_, i) => i === 0)

const { group1, question1, question2, recurringGroup } = state
const question3 = group1.question3

test('proxy test', () => {
  expect(group1.$isActive).toBe(false)
  expect(question3.$isActive).toBe(false)
  expect(question2.$isActive).toBe(true)
  expect(form.recurringGroup.length).toBe(2)
  expect(recurringGroup[0].question4.$isRequired).toBe(true)
  expect(recurringGroup[1].question4.$isRequired).toBe(false)

  question1.$value = 3

  expect(group1.$isActive).toBe(true)
  expect(question3.$isActive).toBe(true)
  expect(question2.$isActive).toBe(false)

  state.recurringGroup.$remove(1)

  expect(form.recurringGroup.length).toBe(1)
  expect(recurringGroup.length).toBe(1)
})
