import {
  createFormBuilder,
  Form,
  FormGroup,
  FormState,
  RecurringGroup,
} from '../src'

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

export function getBuilder(): FormState<IMyForm> {
  const myForm: IMyForm = {
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

  const builder = createFormBuilder(myForm)
  const configurator = builder.getConfigurator()

  configurator.question1.$isRequiredWhen(() => true)

  configurator.question2
    .$isActiveWhen((form) => form.question1.$isActiveAnd((x) => x > 3))
    .$isRequiredWhen(() => false)

  configurator.group1.$isActiveWhen((form) =>
    form.question1.$isActiveAnd((x) => x <= 3)
  )

  configurator.group1.question3.$isActiveWhen(() => true)

  configurator.recurringGroup.question4.$isRequiredWhen((_, i) => i === 0)

  const state = builder.getState()

  return state
}
