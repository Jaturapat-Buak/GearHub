function updateId(input) {
    const options = document.getElementById('productOptions').options;
    const hiddenInput = document.getElementById('selected_product_id');
    const qtyInput = document.getElementById('qty_input');
    const alertText = document.getElementById('stock_alert');
    const submitBtn = document.getElementById('submit_btn');

    for (let i = 0; i < options.length; i++) {
        if (options[i].value === input.value) {
            const prodId = options[i].getAttribute('data-id');
            const maxQty = parseInt(options[i].getAttribute('data-max'));
            
            hiddenInput.value = prodId;
            qtyInput.max = maxQty;

            qtyInput.oninput = function() {
                const currentVal = parseInt(this.value);
                if (currentVal > maxQty) {
                    alertText.classList.remove('d-none');
                    submitBtn.disabled = true;
                } else {
                    alertText.classList.add('d-none');
                    submitBtn.disabled = false;
                }
            };
            return;
        }
    }
    hiddenInput.value = "";
    submitBtn.disabled = false;
}