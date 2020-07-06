var src_1 = require('../src');
function getBuilder() {
    var myForm = {
        question1: 5,
        question2: 'answer',
        group1: {
            question3: [22.5]
        },
        recurringGroup: [
            {
                question4: 'example'
            },
            {
                question4: 'example 2'
            },
        ]
    };
    var builder = src_1.createFormBuilder(myForm);
    var configurator = builder.getConfigurator();
    configurator.question1.$isRequired(function () { return true; });
    configurator.question2
        .$isActive(function (form) {
        var _a = form.question1, $value = _a.$value, $isActive = _a.$isActive;
        return $isActive && $value > 3;
    })
        .$isRequired(function () { return false; });
    configurator.group1.$isActive(function (form) {
        var _a = form.question1, $value = _a.$value, $isActive = _a.$isActive;
        return $isActive && $value <= 3;
    });
    configurator.group1.question3.$isActive(function () { return true; });
    configurator.recurringGroup.question4.$isRequired(function (_, i) { return i === 0; });
    var state = builder.getState();
    return state;
}
exports.getBuilder = getBuilder;
