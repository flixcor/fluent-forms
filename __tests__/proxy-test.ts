import { createProxy } from '../src/form-item-proxy'

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

test('proxy test', () => {
  expect(proxy.$isActive).toBe(true)
  expect(proxy.$isRequired).toBe(false)
  expect((<any>proxy.sub).$isActive).toBe(true)
  expect((<any>proxy.sub).$isRequired).toBe(false)
  expect((<any>proxy.sub).$path).toBe('sub')
  expect((<any>proxy.sub.numQ).$value).toBe(numQ)
  expect((<any>proxy.arrQ).$path).toBe('arrQ')
  expect((<any>proxy.arrQ).$value).toBe(arrQ)
  ;(<any>proxy.sub.numQ).$value = newVal
  expect(obj.sub.numQ).toBe(newVal)
})
