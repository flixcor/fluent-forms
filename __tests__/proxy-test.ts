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

const sub = asDollars(proxy.sub)
const subNumQ = asDollars(proxy.sub.numQ)
const arrQP = asDollars(proxy.arrQ)
const recG = asDollars(proxy.recG)
const recG0StrQ = asDollars(proxy.recG[0].strQ)

test('proxy test', () => {
  expect(sub.$isActive).toBe(true)
  expect(sub.$isRequired).toBe(false)
  expect(sub.$path).toBe('sub')
  expect(subNumQ.$value).toBe(numQ)
  expect(arrQP.$path).toBe('arrQ')
  expect(arrQP.$value).toBe(arrQ)
  expect(recG.$path).toBe('recG')
  expect(recG0StrQ.$value).toBe(strQ)
  expect(recG0StrQ.$path).toBe('recG.0.strQ')

  asDollars(proxy.sub.numQ).$value = newVal

  expect(obj.sub.numQ).toBe(newVal)
})
