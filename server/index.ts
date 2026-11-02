import './loadEnv.js';
import { createApp } from './app.js';
import { logAuthStatus } from './config/authConfig.js';
import { logConfigStorageStatus } from './config/configStore.js';
import { logEmailServiceStatus } from './config/emailConfig.js';
import { logAdminAuthStatus } from './middleware/adminAuth.js';
import { verifySmtpConnection } from './services/emailService.js';

logEmailServiceStatus();
logConfigStorageStatus();
logAdminAuthStatus();
logAuthStatus();
void verifySmtpConnection();

const port = Number(process.env.PORT) || 8080;

createApp().listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
