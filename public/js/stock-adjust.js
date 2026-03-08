const urlParams = new URLSearchParams(window.location.search)
const product = urlParams.get("product")
if (product) {
    const input = document.getElementById("product_input")
    input.value = product
    validateProduct()
}
function validateProduct() {
    const input = document.getElementById("product_input")
    const options = document.getElementById("productOptions").options
    const error = document.getElementById("product_error")
    const submitBtn = document.getElementById("submit_btn")
    const hiddenId = document.getElementById("selected_product_id")
    const stockBox = document.getElementById("current_stock")
    let found = false
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === input.value) {
            hiddenId.value = options[i].dataset.id
            stockBox.value = options[i].dataset.stock
            found = true
            break
        }
    }
    if (found) {
        error.classList.add("d-none")
        submitBtn.disabled = false
    } else {
        error.classList.remove("d-none")
        submitBtn.disabled = true
        hiddenId.value = ""
        stockBox.value = "-"
    }
}