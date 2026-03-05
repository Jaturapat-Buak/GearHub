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
