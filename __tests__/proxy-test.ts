import { createProxy, dollars } from '../src/form-item-proxy'

const strQ = 'string'
const numQ = 5
const arrQ = [strQ, numQ]

const newVal = 3

const obj = {
  strQ,
  numQ,
  recG: [
    {
      strQ,
      numQ,
    },
  ],
  sub: {
    strQ,
    numQ,
  },
  arrQ,
}

const proxy = createProxy(obj)

function asDollars(input: unknown): dollars<unknown> {
  return input as dollars<unknown>
}

test('proxy test', () => {
  expect(proxy.$isActive).toBe(true)
  expect(proxy.$isRequired).toBe(false)
  expect(asDollars(proxy.sub).$isActive).toBe(true)
  expect(asDollars(proxy.sub).$isRequired).toBe(false)
  expect(asDollars(proxy.sub).$path).toBe('sub')
  expect(asDollars(proxy.sub.numQ).$value).toBe(numQ)
  expect(asDollars(proxy.arrQ).$path).toBe('arrQ')
  expect(asDollars(proxy.arrQ).$value).toBe(arrQ)
  expect(asDollars(proxy.recG).$path).toBe('recG')
  expect(asDollars(proxy.recG[0].strQ).$value).toBe(strQ)
  expect(asDollars(proxy.recG[0].strQ).$path).toBe('recG.0.strQ')

  asDollars(proxy.sub.numQ).$value = newVal

  expect(obj.sub.numQ).toBe(newVal)
})
