/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s'],
  testPathIgnorePatterns: ['/node_modules/'],
};
