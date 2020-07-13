import { getProxy } from '../example'

const proxy = getProxy()
proxy.question2.$isActiveWhen(() => false)
const { group1, question1, question2, recurringGroup } = proxy
const question3 = group1.question3

test('proxy test', () => {
  expect(group1.$isActive).toBe(true)
  // expect(group1.question3.$value).toStrictEqual([22.5])
  expect(group1.question3.$isRequired).toBe(false)
  expect(question3.$isActive).toBe(true)
  expect(question2.$isActive).toBe(false)
  expect(question1.$value).toBe(5)
  expect(recurringGroup.length).toBe(2)
})
