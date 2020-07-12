/// <reference types="jest" />

import { getBuilder } from '../example/index'

const builder = getBuilder()
const state = builder.getState()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('All test', () => {
  const {
    group1,
    question1,
    question2,
    recurringGroup: [
      { question4: firstQuestion4 },
      { question4: secondQuestion4 },
    ],
  } = state
  const question3 = group1.question3

  expect(group1.$isActive).toBe(false)
  expect(question3.$isActive).toBe(false)
  expect(question2.$isActive).toBe(true)
  expect(firstQuestion4.$isRequired).toBe(true)
  expect(secondQuestion4.$isRequired).toBe(false)

  question1.$value = 3

  sleep(1).then(() => {
    expect(group1.$isActive).toBe(true)
    expect(question3.$isActive).toBe(true)
    expect(question2.$isActive).toBe(false)
  })
})
