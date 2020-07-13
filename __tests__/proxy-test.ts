/// <reference types="jest" />

import { getProxy } from '../example'

const builder = getProxy()
const config = builder.getConfigurator()
const state = builder.getState()

config.question2.$isActiveWhen((f) => f.question1.$isActiveAnd((x) => x <= 5))
config.recurringGroup.question4.$isRequiredWhen((_, i) => i === 0)
const { group1, question1, question2, recurringGroup } = state
const question3 = group1.question3

test('proxy test', () => {
  expect(group1.$isActive).toBe(true)
  expect(group1.question3.$value).toStrictEqual([22.5])
  expect(group1.question3.$isRequired).toBe(false)
  expect(question3.$isActive).toBe(true)
  expect(question2.$isActive).toBe(true)
  expect(question1.$value).toBe(5)
  expect(recurringGroup.length).toBe(2)

  state.question1.$value = 6
  expect(question2.$isActive).toBe(false)

  expect(recurringGroup[0].question4.$isRequired).toBe(true)
  expect(recurringGroup[1].question4.$isRequired).toBe(false)
})
