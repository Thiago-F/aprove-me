export const regexConstants = {
    user: {
      validationName: /^(?=.*\s)[A-Za-zÀ-ÖØ-öø-ÿ\s']+$/,
      validatePhone:/^([0-9]{10}|[0-9]{11})$/,
      validationPassword: /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,250}$/,
    },
    default: {},
  };
  