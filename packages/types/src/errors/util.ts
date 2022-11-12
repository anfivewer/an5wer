export const createCustomError = (errorName: string) => {
  class CustomError extends Error {
    name = errorName;
  }

  try {
    // @ts-ignore
    CustomError.name = errorName;
  } catch (error) {
    //
  }

  return CustomError;
};
