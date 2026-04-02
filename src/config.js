/**
 * Zooniverse IFE Workshop Configuration
 *
 * Fork this repo, change these values to your Zooniverse project,
 * and you have a working custom classifier.
 */
const config = {
  // Your Zooniverse project ID (find it in the Project Builder URL or API)
  projectId: '31425',

  // Your workflow ID (find it in the Project Builder under Workflows)
  workflowId: null, // null = use the project's default active workflow

  // Environment: 'production' or 'staging'
  environment: 'production',

  // Number of subjects to fetch at a time
  subjectBatchSize: 10,

  // Project metadata (displayed in the UI)
  title: 'Zooniverse IFE Classifier',

  // OAuth — set these in .env (see .env.example). When all three are set,
  // a "Log in with Zooniverse" button appears in the header.
  oauthClientId: import.meta.env.VITE_OAUTH_CLIENT_ID || null,
  oauthClientSecret: import.meta.env.VITE_OAUTH_CLIENT_SECRET || null,
  oauthRedirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || null,

  // Data rights / privacy / Terms & Conditions
  links: {
    privacyPolicy: 'https://www.zooniverse.org/privacy',
    termsOfUse: 'https://www.zooniverse.org/privacy#terms',
    dataRetention: null,
    talkBoard: null, // auto-populated from project if null
  }
};

export default config;
