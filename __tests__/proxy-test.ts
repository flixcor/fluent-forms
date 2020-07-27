/// <reference types="jest" />

import { createFormBuilder } from '../src'

export type IMyForm = {
  question1: number
  question2: string
  group1: IGroup1
  recurringGroup: IGroup2[]
  file: URL
}

type IGroup1 = {
  question3: (number | string)[]
}

type IGroup2 = {
  question4: string
}

const urlString = 'https://localhost:433/file.csv'

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
    file: new URL(urlString),
  }
}

const builder = createFormBuilder<IMyForm>(getForm(), {
  question1: {
    $isRequired: true,
  },
  question2: {
    $isActive(form) {
      return form.question1.$isActiveAnd((x) => x > 3)
    },
  },
  group1: {
    $isActive(form) {
      return form.question1.$isActiveAnd((x) => x <= 3)
    },
    question3: {
      $isActive: true,
    },
  },
  recurringGroup: [
    {
      question4: {
        $isRequired(_, i) {
          return i === 0
        },
      },
    },
  ],
  file: {},
})
const state = builder.getState()
const form = builder.getForm()
const { group1, question1, question2, recurringGroup } = state
const question3 = group1.question3

test('proxy test', () => {
  expect(state.question1.$isRequired).toBe(true)
  expect(state.question2.$isRequired).toBe(false)
  expect(state.file.$value.toString()).toBe(urlString)
  expect(state.group1.question3.$value).toStrictEqual([22.5])
  expect(question1.$value).toBe(5)
  expect(group1.$isActive).toBe(false)
  expect(question3.$isActive).toBe(false)
  expect(question2.$isActive).toBe(true)
  expect(form.recurringGroup?.length).toBe(2)
  expect(recurringGroup[0].question4.$isRequired).toBe(true)
  expect(recurringGroup[1].question4.$isRequired).toBe(false)

  question1.$value = 3

  expect(group1.$isActive).toBe(true)
  expect(question3.$isActive).toBe(true)
  expect(question2.$isActive).toBe(false)

  state.recurringGroup.$remove(1)

  expect(form.recurringGroup?.length).toBe(1)
  expect(recurringGroup.length).toBe(1)
})
