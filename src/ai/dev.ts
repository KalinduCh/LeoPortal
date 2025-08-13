
import { config as configDotenv } from 'dotenv';
import path from 'path';
// Removed fs import as it's not strictly needed for this loading strategy

// dotenv loads variables from the specified file into process.env.
// By default, it does NOT override variables in process.env that are already set.
// To ensure .env.local values take precedence over .env values for the Genkit dev server,
// we load .env.local first. Any variables it defines will be set.
// Then, when we load .env, any variables it defines that were *not* in .env.local will be set.
// If a variable name exists in both, the one from .env.local (loaded first) will persist.

configDotenv({ path: path.resolve(process.cwd(), '.env.local') });

// Now, load .env. Variables from here will only be added if they weren't already set by .env.local.
configDotenv({ path: path.resolve(process.cwd(), '.env') });

// Fallback if neither .env.local nor .env is found at specific paths,
// dotenv's default config() tries to load a file named '.env' from the current working directory.
// The explicit loads above should cover most cases. If you want to be absolutely sure
// it attempts the default .env load if the specified paths don't exist, you could add:
// if (!fs.existsSync(path.resolve(process.cwd(), '.env.local')) && !fs.existsSync(path.resolve(process.cwd(), '.env'))) {
//   configDotenv(); // Default .env load
// }
// However, the two explicit loads above are generally preferred for clarity.


import '@/ai/flows/generate-communication-flow.ts';
import '@/ai/flows/generate-project-proposal-flow.ts';
