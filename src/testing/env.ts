export const withEnvVar = async <T>(
  name: string,
  value: string,
  callback: () => Promise<T> | T,
): Promise<T> => {
  const previous = process.env[name];
  process.env[name] = value;

  try {
    return await callback();
  } finally {
    restoreEnvVar(name, previous);
  }
};

const restoreEnvVar = (name: string, previous: string | undefined): void => {
  if (previous === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = previous;
};
