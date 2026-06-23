export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|fr|tn)$/i;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;

export const EMAIL_ERROR = 'Email must be valid and end with .com, .fr, or .tn.';
export const PASSWORD_ERROR =
  'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one digit.';
