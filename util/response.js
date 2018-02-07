function failure(code, message) {
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
        body: body
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