let maxStock = 0
let productValid = false
let qtyValid = false

function validateProduct(){
    const input = document.getElementById("product_input")
    const options = document.getElementById("productOptions").options
    const error = document.getElementById("product_error")
    const hiddenId = document.getElementById("selected_product_id")
    const stockBox = document.getElementById("current_stock")

    productValid = false

    for(let i = 0; i < options.length; i++){
        const productName = options[i].value.split(" (")[0]

        if(productName === input.value){
            hiddenId.value = options[i].dataset.id
            maxStock = parseInt(options[i].dataset.max)
            stockBox.value = maxStock
            productValid = true
            break
        }
    }

    if(productValid){
        error.classList.add("d-none")
    }else{
        error.classList.remove("d-none")
        hiddenId.value = ""
        stockBox.value = "-"
    }

    validateQty()
    checkSubmit()
}

function validateQty(){
    const qty = parseInt(document.getElementById("qty_input").value)
    const alert = document.getElementById("stock_alert")

    qtyValid = false

    if(!qty){
        alert.classList.add("d-none")
        checkSubmit()
        return
    }

    if(qty > maxStock){
        alert.classList.remove("d-none")
    }else{
        alert.classList.add("d-none")
        qtyValid = true
    }

    checkSubmit()
}

function checkSubmit(){
    const submitBtn = document.getElementById("submit_btn")

    if(productValid && qtyValid){
        submitBtn.disabled = false
    }else{
        submitBtn.disabled = true
    }
}

const urlParams = new URLSearchParams(window.location.search)
const product = urlParams.get("product")

if(product){
    const input = document.getElementById("product_input")
    input.value = product
    validateProduct()
}

function updateId(input) {
    const options = document.querySelectorAll("#productOptions option");
    const hiddenInput = document.getElementById("selected_product_id");
    const qtyInput = document.getElementById("qty_input");
    const alertText = document.getElementById("stock_alert");
    const submitBtn = document.getElementById("submit_btn");

    let found = false;

    options.forEach((option) => {
        if (input.value.startsWith(option.value.split(" (")[0])) {
            const prodId = option.dataset.id;
            const maxQty = parseInt(option.dataset.max);

            hiddenInput.value = prodId;
            qtyInput.max = maxQty;

            qtyInput.oninput = function () {
                const currentVal = parseInt(this.value);

                if (currentVal > maxQty) {
                    alertText.classList.remove("d-none");
                    submitBtn.disabled = true;
                } else {
                    alertText.classList.add("d-none");
                    submitBtn.disabled = false;
                }
            };

            found = true;
        }
    });

    if (!found) {
        hiddenInput.value = "";
    }
}
