export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|fr)$/i;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;

export const EMAIL_ERROR = "L'adresse email doit etre valide et se terminer par .com ou .fr.";
export const PASSWORD_ERROR =
  'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre.';
