function updateId(input) {
  const options = document.getElementById("productOptions").options;
  const hiddenInput = document.getElementById("selected_product_id");

  for (let i = 0; i < options.length; i++) {
    if (options[i].value === input.value) {
      hiddenInput.value = options[i].getAttribute("data-id");
      return;
    }
  }
  hiddenInput.value = "";
}
