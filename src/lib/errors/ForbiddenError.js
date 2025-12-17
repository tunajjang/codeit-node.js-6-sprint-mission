class ForbiddenError extends Error {
  constructor(modelName) {
    super(`You are not allowed to control this ${modelName}.`);
    this.name = 'ForbiddenError';
  }
}

export default ForbiddenError;
