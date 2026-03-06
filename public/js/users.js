function editUser(id, username, full_name, role) {
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.action = "/users/edit/" + id;
  }

  const usernameInput = document.getElementById("edit_username");
  const nameInput = document.getElementById("edit_full_name");
  const roleInput = document.getElementById("edit_role");

  if (usernameInput) usernameInput.value = username;
  if (nameInput) nameInput.value = full_name;
  if (roleInput) roleInput.value = role;

  const editModalEl = document.getElementById("editUserModal");
  if (editModalEl) {
    const editModal = new bootstrap.Modal(editModalEl);
    editModal.show();
  }
}
