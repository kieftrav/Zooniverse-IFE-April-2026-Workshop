/**
 * Config loader with fallback to example config
 */
let config;

try {
  const configModule = await import('./config.js');
  config = configModule.default;
} catch (error) {
  console.warn('No file found at src/config.js, defaulting to example config');
  try {
    const exampleConfigModule = await import('./config.example.js');
    config = exampleConfigModule.default;
  } catch (fallbackError) {
    console.error('Failed to load config.example.js:', fallbackError);
    throw new Error('Failed to load configuration files');
  }
}

export default config;