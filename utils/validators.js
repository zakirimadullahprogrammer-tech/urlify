function isValidUsername(username) {
  if (typeof username !== "string") {
    return false;
  }

  const value = username.trim();

  return /^[a-z][a-z0-9_]{2,29}$/.test(value);
}

function isValidFullName(fullname) {
  if (typeof fullname !== "string") {
    return false;
  }

  const value = fullname.trim();

  if (value.length < 2 || value.length > 100) {
    return false;
  }

  return /^[A-Za-z][A-Za-z\s'.-]*$/.test(value);
}

function isValidPassword(password) {
  if (typeof password !== "string") {
    return false;
  }

  if (password.length < 8 || password.length > 64) {
    return false;
  }

  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#])[A-Za-z\d@$!%*?&_#]+$/.test(password);
}

module.exports = {
  isValidUsername,
  isValidFullName,
  isValidPassword
};