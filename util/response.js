var utilities = require("./utilities")

function failure(code, message) {
    //401: exist
    //402: access denied
    //403: do not have permission && orther user error
    //404: not found
    //500: server error 
    return {
        code: code,
        message: message,
        body: {}
    }
}

function success(body) {
    return {
        code: 200,
        message: "Successfully",
        body:body
    }
}

function successList(body, total, page, has_more_page) {
    return {
        code: 200,
        message: "Successfully",
        body: body,
        meta_data: {
            total: total,
            current_page: page,
            has_more_page: has_more_page
        }
    }
}
module.exports = {
    successList: successList,
    success: success,
    failure: failure
}